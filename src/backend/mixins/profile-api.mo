import Map "mo:core/Map";
import Time "mo:core/Time";

import Types "../types/profile";
import Common "../types/common";
import AuthTypes "../types/auth";
import AuthLib "../lib/auth";
import ProfileLib "../lib/profile";

/// Profile domain API: onboarding and settings.
///
/// Per-user privacy: every data endpoint takes a `sessionToken` and validates
/// that the caller's session exists, is unexpired, and belongs to the
/// `userId` (email) the request targets. A mismatch traps with
/// "unauthorized". This is enforced here in addition to the OQL layer's
/// `.ownedBy("userId").controllerOrScoped()` scoping on the `profile` entity.
///
/// State slices are injected by the composition root in main.mo.
mixin (
  profiles : Map.Map<Common.UserId, Types.Profile>,
  sessions : Map.Map<AuthTypes.SessionToken, AuthTypes.Session>,
) {
  /// Save or update a user's profile. Called during onboarding (first login)
  /// and from Settings (edit later). Computes and stores BMR.
  public shared func saveProfile(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, profile : Types.Profile) : async Types.Profile {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let withBmr = { profile with bmr = ProfileLib.calculateBMR(profile) };
    profiles.add(userId, withBmr);
    withBmr;
  };

  /// Retrieve a user's profile, or null if not yet onboarded.
  public query func getProfile(sessionToken : AuthTypes.SessionToken, userId : Common.UserId) : async ?Types.Profile {
    AuthLib.requireSession(sessions, sessionToken, userId);
    profiles.get(userId);
  };

  /// Check whether a user has completed onboarding.
  public query func isOnboarded(sessionToken : AuthTypes.SessionToken, userId : Common.UserId) : async Bool {
    AuthLib.requireSession(sessions, sessionToken, userId);
    switch (profiles.get(userId)) {
      case (?_) true;
      case null false;
    };
  };
};
