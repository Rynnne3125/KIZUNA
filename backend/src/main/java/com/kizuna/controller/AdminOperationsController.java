package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.model.AdminActivityLog;
import com.kizuna.model.SystemSettings;
import com.kizuna.model.User;
import com.kizuna.repository.AdminActivityLogRepository;
import com.kizuna.repository.SystemSettingsRepository;
import com.kizuna.repository.UserFirestoreRepository;
import com.kizuna.repository.UserRepository;
import com.kizuna.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminOperationsController {

    private final AdminActivityLogRepository activityLogRepository;
    private final SystemSettingsRepository settingsRepository;
    private final UserFirestoreRepository userFirestoreRepository;
    private final UserRepository userRepository;

    public AdminOperationsController(AdminActivityLogRepository activityLogRepository,
                                     SystemSettingsRepository settingsRepository,
                                     UserFirestoreRepository userFirestoreRepository,
                                     UserRepository userRepository) {
        this.activityLogRepository = activityLogRepository;
        this.settingsRepository = settingsRepository;
        this.userFirestoreRepository = userFirestoreRepository;
        this.userRepository = userRepository;
    }

    // 1. Nhật ký Hoạt động Quản trị (Admin Activity Logs)
    @GetMapping("/activity-logs")
    public ResponseEntity<ApiResponse<List<AdminActivityLog>>> getActivityLogs(
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(ApiResponse.success("Lấy nhật ký hoạt động quản trị thành công",
                activityLogRepository.findRecent(limit)));
    }

    @PostMapping("/activity-logs")
    public ResponseEntity<ApiResponse<AdminActivityLog>> createActivityLog(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {
        String adminUser = principal != null ? principal.getUsername() : body.getOrDefault("adminUsername", "admin");
        AdminActivityLog created = activityLogRepository.record(
                adminUser,
                body.getOrDefault("action", "ADMIN_ACTION"),
                body.getOrDefault("targetType", "SYSTEM"),
                body.getOrDefault("targetId", ""),
                body.getOrDefault("details", "")
        );
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhật ký hoạt động", created));
    }

    // 2. Bộ Quét Tài Khoản Bất Thường Tự Động (Auto Anti-Cheat Anomaly Scanner)
    @GetMapping("/anti-cheat/anomalies")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> scanAntiCheatAnomalies() {
        List<User> users = new ArrayList<>();
        try {
            users = userFirestoreRepository.getAllUsers();
        } catch (Exception ignored) {}
        if (users.isEmpty()) {
            users = userRepository.findAll();
        }

        List<Map<String, Object>> anomalies = new ArrayList<>();
        Instant now = Instant.now();

        for (User u : users) {
            if (u.isDeleted() || "ROLE_ADMIN".equalsIgnoreCase(u.getRole())) continue;

            int riskScore = 0;
            List<String> flags = new ArrayList<>();
            List<String> reasons = new ArrayList<>();

            int ap = u.getActivePoints();
            int xp = u.getTotalXp();
            int streak = u.getCurrentStreak();

            // Rule 1: Streak vượt quá tuổi tài khoản (dấu hiệu đổi đồng hồ thiết bị)
            long accountAgeDays = -1;
            if (u.getCreatedAt() != null && !u.getCreatedAt().isBlank()) {
                try {
                    Instant created = Instant.parse(u.getCreatedAt());
                    accountAgeDays = Math.max(1, Duration.between(created, now).toDays() + 1);
                    if (streak > accountAgeDays + 2) {
                        riskScore += 50;
                        flags.add("STREAK_EXCEEDS_ACCOUNT_AGE");
                        reasons.add(String.format("Streak %d ngày vượt quá tuổi tài khoản (%d ngày) — nghi ngờ đổi giờ thiết bị.", streak, accountAgeDays));
                    }
                    double apPerDay = (double) ap / accountAgeDays;
                    if (ap >= 1200 && apPerDay >= 600) {
                        riskScore += 45;
                        flags.add("RAPID_AP_VELOCITY");
                        reasons.add(String.format("Tốc độ tích lũy Điểm Năng Động bất thường (~%d AP/ngày).", Math.round(apPerDay)));
                    }
                } catch (Exception ignored) {}
            }

            // Rule 2: Tỷ lệ AP/XP bất thường (spam bài tập để cày bảng xếp hạng)
            if (ap >= 1000 && (xp == 0 || (double) ap / Math.max(1, xp) >= 2.2)) {
                riskScore += 40;
                flags.add("HIGH_AP_LOW_XP_RATIO");
                reasons.add(String.format("Điểm Năng Động (%d AP) cao bất thường so với tổng XP (%d XP).", ap, xp));
            }

            // Rule 3: Streak cao nhưng hầu như không có XP học tập
            if (streak >= 14 && xp < 100) {
                riskScore += 35;
                flags.add("EXTREME_STREAK_NO_PROGRESS");
                reasons.add(String.format("Chuỗi Streak %d ngày nhưng tổng XP chỉ đạt %d XP.", streak, xp));
            }

            // Rule 4: AP quá lớn ở bậc Tân binh chưa qua bài test
            if (ap >= 2500 && ("Tân binh".equalsIgnoreCase(u.getLevel()) || u.getLevel() == null)) {
                riskScore += 30;
                flags.add("BEGINNER_AP_SPIKE");
                reasons.add(String.format("Tài khoản bậc Tân binh có %d AP — cần xác minh nguồn điểm.", ap));
            }

            // Rule 5: Đã từng bị gắn cờ anti-cheat
            if (u.getLastAntiCheatNote() != null && !u.getLastAntiCheatNote().isBlank() && riskScore > 0) {
                riskScore += 15;
                flags.add("REPEAT_OFFENDER");
                reasons.add("Tài khoản từng có ghi nhận xử lý chống gian lận trước đó.");
            }

            if (riskScore >= 30) {
                String severity = riskScore >= 70 ? "HIGH" : (riskScore >= 45 ? "MEDIUM" : "LOW");
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("userId", u.getId());
                item.put("username", u.getUsername());
                item.put("fullName", u.getFullName());
                item.put("email", u.getEmail());
                item.put("level", u.getLevel());
                item.put("activePoints", ap);
                item.put("totalXp", xp);
                item.put("currentStreak", streak);
                item.put("enabled", u.isEnabled());
                item.put("riskScore", Math.min(100, riskScore));
                item.put("severity", severity);
                item.put("flags", flags);
                item.put("reasons", reasons);
                item.put("detectedAt", now.toString());
                anomalies.add(item);
            }
        }

        anomalies.sort((a, b) -> Integer.compare(
                ((Number) b.get("riskScore")).intValue(),
                ((Number) a.get("riskScore")).intValue()));

        return ResponseEntity.ok(ApiResponse.success("Quét bất thường chống gian lận hoàn tất", anomalies));
    }

    // 3. Cài đặt Hệ thống & Chế độ Bảo trì (System Settings / Maintenance Mode)
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<SystemSettings>> getSystemSettings() {
        return ResponseEntity.ok(ApiResponse.success("Lấy cài đặt hệ thống thành công", settingsRepository.getSettings()));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<SystemSettings>> updateSystemSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SystemSettings request) {
        String adminUser = principal != null ? principal.getUsername() : "admin";
        SystemSettings saved = settingsRepository.save(request, adminUser);
        activityLogRepository.record(
                adminUser,
                "SYSTEM_SETTINGS_UPDATE",
                "SYSTEM",
                "settings",
                String.format("Cập nhật hệ thống: maintenanceMode=%s, allowNewRegistrations=%s, aiSenseiEnabled=%s",
                        saved.isMaintenanceMode(), saved.isAllowNewRegistrations(), saved.isAiSenseiEnabled())
        );
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cài đặt hệ thống thành công", saved));
    }
}
