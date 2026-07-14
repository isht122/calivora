import AccessControl "mo:caffeineai-authorization/access-control";
import Runtime "mo:core/Runtime";

/// Admin API: canister configuration.
/// State slices are injected by the composition root in main.mo.
mixin (
  accessControlState : AccessControl.AccessControlState,
  logMealApiKey : { var value : Text },
) {
  /// Store the LogMeal API key in canister state. Admin-only — the key never
  /// lives in frontend code. Used by the meal domain when calling the LogMeal
  /// API via http-outcalls.
  public shared ({ caller }) func setLogMealApiKey(key : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: only admins can set the LogMeal API key");
    };
    logMealApiKey.value := key;
  };
};
