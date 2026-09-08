package com.kizuna.service.impl;

import com.kizuna.dto.response.UserProfileResponse;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.UserProfile;
import com.kizuna.repository.UserRepository;
import com.kizuna.security.FirebaseUserPrincipal;
import com.kizuna.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public UserProfileResponse syncFirebaseUser(FirebaseUserPrincipal principal) {
        String uid = principal.getUid();
        Optional<UserProfile> existing = userRepository.findById(uid);

        UserProfile user;
        Date now = new Date();

        if (existing.isPresent()) {
            user = existing.get();
            user.setDisplayName(principal.getName() != null ? principal.getName() : user.getDisplayName());
            user.setPhotoUrl(principal.getPicture() != null ? principal.getPicture() : user.getPhotoUrl());
            user.setEmail(principal.getEmail() != null ? principal.getEmail() : user.getEmail());
            user.setLastActiveDate(now);
            user.setUpdatedAt(now);
        } else {
            user = UserProfile.builder()
                    .uid(uid)
                    .email(principal.getEmail())
                    .displayName(principal.getName() != null ? principal.getName() : "Learner")
                    .photoUrl(principal.getPicture())
                    .targetJlptLevel("N5")
                    .dailyStreak(1)
                    .totalXp(0)
                    .role("ROLE_USER")
                    .lastActiveDate(now)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
        }

        userRepository.save(uid, user);
        return UserProfileResponse.fromEntity(user);
    }

    @Override
    public UserProfileResponse getCurrentProfile(String uid) {
        UserProfile user = userRepository.findById(uid)
                .orElseThrow(() -> new ResourceNotFoundException("User", uid));
        return UserProfileResponse.fromEntity(user);
    }

    @Override
    public UserProfileResponse updateTargetLevel(String uid, String targetLevel) {
        UserProfile user = userRepository.findById(uid)
                .orElseThrow(() -> new ResourceNotFoundException("User", uid));
        user.setTargetJlptLevel(targetLevel.toUpperCase());
        user.setUpdatedAt(new Date());
        userRepository.save(uid, user);
        return UserProfileResponse.fromEntity(user);
    }
}
