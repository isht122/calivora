module {
  /// A user's email address, used as the unique identity key.
  public type Email = Text;

  /// A one-time verification code sent to a user's email.
  public type Code = Text;

  /// A session token issued after successful OTP verification.
  /// Used by the frontend to authenticate subsequent calls.
  public type SessionToken = Text;

  /// A timestamp in nanoseconds since epoch (matches Time.now()).
  public type Timestamp = Nat;

  /// How long a pending code is valid, in nanoseconds.
  public type CodeTtl = Nat;

  /// How long a session is valid, in nanoseconds.
  public type SessionTtl = Nat;

  /// A pending (unverified) email verification code, keyed by email.
  public type PendingCode = {
    email : Email;
    code : Code;
    createdAt : Timestamp;
    expiresAt : Timestamp;
    attempts : Nat;
  };

  /// An active session, keyed by session token.
  public type Session = {
    token : SessionToken;
    email : Email;
    createdAt : Timestamp;
    expiresAt : Timestamp;
  };

  /// A registered user, keyed by email. Created on first successful login.
  public type User = {
    email : Email;
    createdAt : Timestamp;
    lastLoginAt : Timestamp;
  };

  /// Result of requesting a verification code.
  public type RequestCodeResult = {
    #ok;
    #err : RequestCodeError;
  };

  /// Result of verifying a code.
  public type VerifyCodeResult = {
    #ok : SessionToken;
    #err : VerifyCodeError;
  };

  /// Errors that can occur when requesting a code.
  public type RequestCodeError = {
    #invalidEmail;
    #rateLimited;
    #sendFailed : Text;
  };

  /// Errors that can occur when verifying a code.
  public type VerifyCodeError = {
    #noPendingCode;
    #expired;
    #tooManyAttempts;
    #wrongCode;
  };
};
