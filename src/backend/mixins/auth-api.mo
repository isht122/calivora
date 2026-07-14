import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";

import EmailClient "mo:caffeineai-email/emailClient";

import Types "../types/auth";
import AuthLib "../lib/auth";

/// Auth domain API: email OTP login flow.
/// State slices are injected by the composition root in main.mo.
mixin (
  users : Map.Map<Types.Email, Types.User>,
  pendingCodes : Map.Map<Types.Email, Types.PendingCode>,
  sessions : Map.Map<Types.SessionToken, Types.Session>,
  codeTtl : Types.CodeTtl,
  sessionTtl : Types.SessionTtl,
  maxAttempts : Nat,
) {
  /// Request a one-time verification code be sent to the given email.
  /// Generates a code, stores it as pending, and emails it to the user.
  public shared func requestCode(email : Types.Email) : async Types.RequestCodeResult {
    if (not AuthLib.isValidEmail(email)) {
      return #err(#invalidEmail);
    };

    let now = Time.now().toNat();
    let code = AuthLib.generateCode();
    let pending = AuthLib.createPendingCode(email, code, now, codeTtl);
    pendingCodes.add(email, pending);

    // Best-effort email send: attempt to email the OTP code, but do not
    // block the flow if the email service is unavailable. The code is
    // already stored and can be verified regardless.
    let htmlBody = "<p>Your Calivora verification code is:</p><h2>" # code # "</h2><p>This code expires in 10 minutes.</p>";
    let _ = await EmailClient.sendServiceEmail(
      "no-reply",
      [email],
      "Your Calivora login code",
      htmlBody,
    );

    #ok
  };

  /// Verify a one-time code for an email. On success, creates a session and a
  /// user record (if first login), returning a session token.
  public shared func verifyCode(email : Types.Email, code : Types.Code) : async Types.VerifyCodeResult {
    let now = Time.now().toNat();

    switch (pendingCodes.get(email)) {
      case null {
        return #err(#noPendingCode);
      };
      case (?pending) {
        // Check expiry first.
        if (now > pending.expiresAt) {
          pendingCodes.remove(email);
          return #err(#expired);
        };
        // Check attempt count.
        if (pending.attempts >= maxAttempts) {
          pendingCodes.remove(email);
          return #err(#tooManyAttempts);
        };
        // Check code match.
        if (not Text.equal(pending.code, code)) {
          // Increment attempts and store back.
          pendingCodes.add(email, { pending with attempts = pending.attempts + 1 });
          return #err(#wrongCode);
        };

        // Success: consume the pending code.
        pendingCodes.remove(email);

        // Create user on first login.
        if (users.get(email) == null) {
          users.add(email, AuthLib.createUser(email, now));
        } else {
          // Update lastLoginAt for returning users.
          switch (users.get(email)) {
            case (?u) {
              users.add(email, { u with lastLoginAt = now });
            };
            case null {};
          };
        };

        // Create session.
        let token = AuthLib.generateSessionToken();
        let session = AuthLib.createSession(token, email, now, sessionTtl);
        sessions.add(token, session);

        #ok(token)
      };
    }
  };

  /// Validate a session token and return the associated email, or null if
  /// invalid/expired.
  public query func validateSession(token : Types.SessionToken) : async ?Types.Email {
    switch (sessions.get(token)) {
      case null null;
      case (?session) {
        if (AuthLib.isSessionValid(session, Time.now().toNat())) {
          ?session.email;
        } else {
          null;
        };
      };
    }
  };

  /// Log out: invalidate the given session token.
  public shared func logout(token : Types.SessionToken) : async () {
    sessions.remove(token);
  };

  /// Look up the user record for an email, if registered.
  public query func getUser(email : Types.Email) : async ?Types.User {
    users.get(email)
  };
};
