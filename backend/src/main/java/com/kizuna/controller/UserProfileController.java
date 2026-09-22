package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.response.UserProfileDto;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.User;
import com.kizuna.model.UserProgress;
import com.kizuna.repository.UserRepository;
import com.kizuna.repository.UserProgressRepository;
import com.kizuna.repository.UserSrsRepository;
import com.kizuna.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/user")
public class UserProfileController {

    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;
    private final UserSrsRepository userSrsRepository;

    public UserProfileController(UserRepository userRepository,
                                 UserProgressRepository userProgressRepository,
                                 UserSrsRepository userSrsRepository) {
        this.userRepository = userRepository;
        this.userProgressRepository = userProgressRepository;
        this.userSrsRepository = userSrsRepository;
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileDto>> getUserProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .or(() -> userRepository.findByUsername(principal.getUsername()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getUsername()));

        List<UserProgress> progresses = userProgressRepository.findByUserId(principal.getId());
        long completedMilestones = progresses.stream()
                .filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus()))
                .count();

        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setLevel(user.getLevel());
        dto.setTotalXp(user.getTotalXp());
        dto.setActivePoints(user.getActivePoints());
        dto.setCurrentStreak(user.getCurrentStreak());
        dto.setLongestStreak(user.getLongestStreak());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setMilestonesCompleted((int) completedMilestones);
        dto.setWordsMastered((int) (completedMilestones * 26)); // ~26 words per milestone
        dto.setKanjiMastered((int) (completedMilestones * 10)); // ~10 kanji per milestone

        List<String> badges = new ArrayList<>();
        if (completedMilestones >= 1) badges.add("Kẻ Khởi Đầu (Hoàn thành mốc đầu tiên)");
        if (completedMilestones >= 3) badges.add("Chinh Phục Chữ Cái (Xong Chặng 1)");
        if (user.getCurrentStreak() >= 7) badges.add("Chiến Binh Bền Bỉ (7 Ngày Streak)");
        if (user.getActivePoints() >= 500) badges.add("Ngôi Sao Năng Động (500+ Active Points)");
        dto.setBadges(badges);

        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin hồ sơ học viên thành công", dto));
    }
}
