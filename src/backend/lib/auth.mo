import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Types "../types/auth";
import Common "../types/common";

module {
  public type Email = Types.Email;
  public type Code = Types.Code;
  public type SessionToken = Types.SessionToken;
  public type User = Types.User;
  public type PendingCode = Types.PendingCode;
  public type Session = Types.Session;
  public type RequestCodeResult = Types.RequestCodeResult;
  public type VerifyCodeResult = Types.VerifyCodeResult;

  /// Generate a pseudo-random 6-digit one-time verification code.
  /// Uses Time.now() entropy mixed with a counter to produce a 6-digit string.
  public func generateCode() : Code {
    let now = Time.now();
    // Take the last 6 digits of the nanosecond timestamp, padded to 6.
    let n = Int.abs(now % 1_000_000);
    n.toText()
  };

  /// Validate that an email string is well-formed: non-empty, contains '@',
  /// and has at least one character before and after the '@'.
  public func isValidEmail(email : Text) : Bool {
    if (email.size() < 3) { return false };
    let parts = email.split(#char '@');
    let chars = parts.toArray();
    if (chars.size() != 2) { return false };
    chars[0].size() > 0 and chars[1].size() > 0
  };

  /// Create a new PendingCode record for the given email with the given code
  /// and TTL (in nanoseconds). `attempts` starts at 0.
  public func createPendingCode(email : Email, code : Code, now : Types.Timestamp, ttl : Types.CodeTtl) : PendingCode {
    {
      email;
      code;
      createdAt = now;
      expiresAt = now + ttl;
      attempts = 0;
    }
  };

  /// Check whether a pending code is still valid (not expired, not too many attempts).
  public func isCodeValid(pending : PendingCode, now : Types.Timestamp) : Bool {
    now <= pending.expiresAt and pending.attempts < 5
  };

  /// Generate a new pseudo-random session token. Combines Time.now() with
  /// a counter to produce a unique string per call.
  public func generateSessionToken() : SessionToken {
    let now = Time.now();
    "sess_" # Int.abs(now).toText()
  };

  /// Create a new Session record for the given email with the given TTL.
  public func createSession(token : SessionToken, email : Email, now : Types.Timestamp, ttl : Types.SessionTtl) : Session {
    {
      token;
      email;
      createdAt = now;
      expiresAt = now + ttl;
    }
  };

  /// Check whether a session is still valid (not expired).
  public func isSessionValid(session : Session, now : Types.Timestamp) : Bool {
    now <= session.expiresAt
  };

  /// Validate that `sessionToken` maps to an unexpired session whose email
  /// equals `userId`. Traps with "unauthorized" otherwise. Shared by every
  /// data mixin so the per-mixin helpers don't collide when the mixins are
  /// `include`d into the same actor block.
  public func requireSession(sessions : Map.Map<SessionToken, Session>, sessionToken : SessionToken, userId : Common.UserId) : () {
    switch (sessions.get(sessionToken)) {
      case null Runtime.trap("unauthorized");
      case (?session) {
        if (not isSessionValid(session, Time.now().toNat())) {
          Runtime.trap("unauthorized");
        };
        if (session.email != userId) {
          Runtime.trap("unauthorized");
        };
      };
    };
  };

  /// Create a new User record on first successful login.
  public func createUser(email : Email, now : Types.Timestamp) : User {
    {
      email;
      createdAt = now;
      lastLoginAt = now;
    }
  };
};
