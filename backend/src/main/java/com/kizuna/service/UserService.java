package com.kizuna.service;

import com.kizuna.dto.response.UserProfileResponse;
import com.kizuna.security.FirebaseUserPrincipal;

public interface UserService {

    UserProfileResponse syncFirebaseUser(FirebaseUserPrincipal principal);

    UserProfileResponse getCurrentProfile(String uid);

    UserProfileResponse updateTargetLevel(String uid, String targetLevel);
}
