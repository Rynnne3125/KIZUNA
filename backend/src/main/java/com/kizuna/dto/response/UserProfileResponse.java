package com.kizuna.dto.response;

import com.kizuna.model.UserProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private String uid;
    private String email;
    private String displayName;
    private String photoUrl;
    private String targetJlptLevel;
    private int dailyStreak;
    private long totalXp;
    private String role;
    private Date lastActiveDate;
    private Date createdAt;

    public static UserProfileResponse fromEntity(UserProfile user) {
        if (user == null) return null;
        return UserProfileResponse.builder()
                .uid(user.getUid())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .photoUrl(user.getPhotoUrl())
                .targetJlptLevel(user.getTargetJlptLevel())
                .dailyStreak(user.getDailyStreak())
                .totalXp(user.getTotalXp())
                .role(user.getRole())
                .lastActiveDate(user.getLastActiveDate())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
