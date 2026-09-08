package com.kizuna.model;

import com.google.cloud.firestore.annotation.DocumentId;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IgnoreExtraProperties
public class UserProfile {

    @DocumentId
    private String uid;

    private String email;
    private String displayName;
    private String photoUrl;

    @Builder.Default
    private String targetJlptLevel = "N5";

    @Builder.Default
    private int dailyStreak = 0;

    @Builder.Default
    private long totalXp = 0;

    @Builder.Default
    private String role = "ROLE_USER";

    private Date lastActiveDate;
    private Date createdAt;
    private Date updatedAt;
}
