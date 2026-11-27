package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.AntiCheatAdjustPointsRequest;
import com.kizuna.dto.request.UserRoleRequest;
import com.kizuna.dto.request.UserStatusRequest;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.User;
import com.kizuna.model.UserProgress;
import com.kizuna.model.UserSrsItem;
import com.kizuna.repository.*;
import com.kizuna.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final UserFirestoreRepository userFirestoreRepository;
    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;
    private final UserSrsRepository userSrsRepository;
    private final LeaderboardRepository leaderboardRepository;
    private final AdminActivityLogRepository activityLogRepository;

    public AdminUserController(UserFirestoreRepository userFirestoreRepository,
                               UserRepository userRepository,
                               UserProgressRepository userProgressRepository,
                               UserSrsRepository userSrsRepository,
                               LeaderboardRepository leaderboardRepository,
                               AdminActivityLogRepository activityLogRepository) {
        this.userFirestoreRepository = userFirestoreRepository;
        this.userRepository = userRepository;
        this.userProgressRepository = userProgressRepository;
        this.userSrsRepository = userSrsRepository;
        this.leaderboardRepository = leaderboardRepository;
        this.activityLogRepository = activityLogRepository;
    }

    private String actor(UserPrincipal principal) {
        return principal != null ? principal.getUsername() : "admin";
    }

    // 1. GET ALL (READ ALL - Chỉ lấy user chưa xóa)
    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        try {
            List<User> users = userFirestoreRepository.getAllUsers();
            if (users.isEmpty()) {
                users = userRepository.findAll();
            }
            return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", users));
        } catch (Exception e) {
            List<User> fallback = userRepository.findAll();
            return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng (bộ nhớ tạm)", fallback));
        }
    }

    // 2. GET BY ID (READ ONE)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable String id) {
        try {
            User user = userFirestoreRepository.getUserById(id);
            if (user == null || user.isDeleted()) {
                user = userRepository.findById(id).orElse(null);
            }
            if (user == null || user.isDeleted()) {
                throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
            }
            return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", user));
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi tìm người dùng: " + e.getMessage()));
        }
    }

    // 3. CREATE (POST)
    @PostMapping
    public ResponseEntity<ApiResponse<User>> createUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody User user) {
        try {
            String id = userFirestoreRepository.saveUser(user);
            user.setId(id);
            userRepository.save(user);
            activityLogRepository.record(actor(principal), "USER_CREATE", "USER", id,
                    "Tạo người dùng: " + user.getEmail() + " (" + user.getRole() + ")");
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Tạo người dùng mới thành công trên Firestore", user));
        } catch (Exception e) {
            userRepository.save(user);
            activityLogRepository.record(actor(principal), "USER_CREATE", "USER", user.getId(),
                    "Tạo người dùng (bộ nhớ): " + user.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Tạo người dùng thành công (bộ nhớ)", user));
        }
    }

    // 4. UPDATE (PUT)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> updateUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody User user) {
        try {
            User existing = userFirestoreRepository.getUserById(id);
            if (existing == null) {
                existing = userRepository.findById(id).orElse(null);
            }
            if (existing == null || existing.isDeleted()) {
                throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id + " để cập nhật");
            }
            user.setId(id);
            userFirestoreRepository.saveUser(user);
            userRepository.save(user);
            activityLogRepository.record(actor(principal), "USER_UPDATE", "USER", id,
                    "Cập nhật thông tin tài khoản: " + (user.getFullName() != null ? user.getFullName() : user.getUsername()));
            return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", user));
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            user.setId(id);
            userRepository.save(user);
            activityLogRepository.record(actor(principal), "USER_UPDATE", "USER", id, "Cập nhật thông tin tài khoản");
            return ResponseEntity.ok(ApiResponse.success("Cập nhật người dùng thành công", user));
        }
    }

    // 5. SOFT DELETE (DELETE - Chuyển cờ isDeleted = true)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        try {
            User existing = userFirestoreRepository.getUserById(id);
            if (existing == null) {
                existing = userRepository.findById(id).orElse(null);
            }
            if (existing == null || existing.isDeleted()) {
                throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id + " để xóa");
            }
            userFirestoreRepository.softDeleteUser(id);
            existing.setDeleted(true);
            userRepository.save(existing);
            activityLogRepository.record(actor(principal), "USER_SOFT_DELETE", "USER", id,
                    "Xóa mềm người dùng: " + existing.getEmail());
            return ResponseEntity.ok(ApiResponse.success("Xóa mềm người dùng thành công (isDeleted = true)", id));
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi xóa người dùng: " + e.getMessage()));
        }
    }

    // 6. PHÂN QUYỀN VAI TRÒ (PUT /api/v1/admin/users/{uid}/role)
    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<User>> updateUserRole(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody UserRoleRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        String oldRole = user.getRole();
        user.setRole(request.getRole());
        userRepository.save(user);
        try {
            userFirestoreRepository.saveUser(user);
        } catch (Exception ignored) {}

        activityLogRepository.record(actor(principal), "USER_ROLE_UPDATE", "USER", id,
                "Đổi quyền từ " + oldRole + " -> " + request.getRole());

        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò người dùng thành " + request.getRole() + " thành công", user));
    }

    // 7. KHÓA / MỞ KHÓA TÀI KHOẢN (PUT /api/v1/admin/users/{uid}/status)
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<User>> updateUserStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody UserStatusRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        user.setEnabled(request.getEnabled());
        userRepository.save(user);
        try {
            userFirestoreRepository.saveUser(user);
        } catch (Exception ignored) {}

        String statusMsg = request.getEnabled() ? "Đã mở khóa tài khoản người dùng" : "Đã khóa tài khoản người dùng";
        activityLogRepository.record(actor(principal),
                request.getEnabled() ? "USER_UNBAN" : "USER_BAN", "USER", id, statusMsg);
        return ResponseEntity.ok(ApiResponse.success(statusMsg, user));
    }

    // 8. CHỐNG GIAN LẬN: HỦY / RESET STREAK (POST /api/v1/admin/users/{uid}/reset-streak)
    @PostMapping("/{id}/reset-streak")
    public ResponseEntity<ApiResponse<User>> resetStreak(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        int prevStreak = user.getCurrentStreak();
        if (prevStreak > 0) {
            user.setPreviousStreak(prevStreak);
        }
        user.setCurrentStreak(0);
        user.setUpdatedAt(java.time.Instant.now().toString());
        userRepository.save(user);
        try {
            userFirestoreRepository.saveUser(user);
        } catch (Exception ignored) {}

        leaderboardRepository.findByUserId(id).ifPresent(le -> {
            le.setCurrentStreak(0);
            leaderboardRepository.save(le);
        });

        activityLogRepository.record(actor(principal), "ANTI_CHEAT_RESET_STREAK", "USER", id,
                "Hủy/Reset streak từ " + prevStreak + " về 0 ngày");

        return ResponseEntity.ok(ApiResponse.success("Đã hủy chuỗi streak của người dùng về 0", user));
    }

    // 8b. QUẢN LÝ STREAK: ĐẶT / KHÔI PHỤC STREAK (PUT /api/v1/admin/users/{uid}/streak)
    @PutMapping("/{id}/streak")
    public ResponseEntity<ApiResponse<User>> setOrRestoreStreak(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        Object rawStreak = body.get("streak");
        if (!(rawStreak instanceof Number)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Giá trị streak không hợp lệ"));
        }
        int targetStreak = Math.max(0, ((Number) rawStreak).intValue());
        String reason = body.get("reason") != null ? String.valueOf(body.get("reason")) : "Admin điều chỉnh Streak";
        int prevStreak = user.getCurrentStreak();

        if (targetStreak == 0 && prevStreak > 0) {
            user.setPreviousStreak(prevStreak);
        }
        user.setCurrentStreak(targetStreak);
        if (targetStreak > user.getLongestStreak()) {
            user.setLongestStreak(targetStreak);
        }
        if (targetStreak > 0) {
            String todayVn = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toString();
            user.setLastActiveDate(todayVn);
        }
        user.setLastAntiCheatNote(reason);
        user.setUpdatedAt(java.time.Instant.now().toString());
        userRepository.save(user);
        try {
            userFirestoreRepository.saveUser(user);
        } catch (Exception ignored) {}

        leaderboardRepository.findByUserId(id).ifPresent(le -> {
            le.setCurrentStreak(targetStreak);
            leaderboardRepository.save(le);
        });

        activityLogRepository.record(actor(principal),
                targetStreak > prevStreak ? "ADMIN_RESTORE_STREAK" : "ADMIN_SET_STREAK",
                "USER", id,
                String.format("Điều chỉnh Streak từ %d -> %d ngày. Lý do: %s", prevStreak, targetStreak, reason));

        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật chuỗi streak thành " + targetStreak + " ngày", user));
    }

    // 9. ĐIỀU CHỈNH ĐIỂM NĂNG ĐỘNG (POST /api/v1/admin/users/{uid}/adjust-points)
    @PostMapping("/{id}/adjust-points")
    public ResponseEntity<ApiResponse<User>> adjustPoints(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody AntiCheatAdjustPointsRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        int prevPoints = user.getActivePoints();
        int newPoints = Math.max(0, prevPoints + request.getPointsAdjustment());
        if (request.getPointsAdjustment() < 0 && prevPoints > 0) {
            user.setPreviousActivePoints(prevPoints);
        }
        user.setActivePoints(newPoints);
        if (request.getReason() != null && !request.getReason().isBlank()) {
            user.setLastAntiCheatNote(request.getReason());
        }
        user.setUpdatedAt(java.time.Instant.now().toString());
        userRepository.save(user);
        try {
            userFirestoreRepository.saveUser(user);
        } catch (Exception ignored) {}

        leaderboardRepository.findByUserId(id).ifPresent(le -> {
            le.setActivePoints(newPoints);
            leaderboardRepository.save(le);
        });

        activityLogRepository.record(actor(principal), "ANTI_CHEAT_ADJUST_POINTS", "USER", id,
                String.format("Điều chỉnh %+d AP (Mới: %d AP). Lý do: %s",
                        request.getPointsAdjustment(), newPoints,
                        request.getReason() != null ? request.getReason() : "Admin điều chỉnh"));

        return ResponseEntity.ok(ApiResponse.success("Điều chỉnh điểm thành công. Điểm mới: " + newPoints, user));
    }

    // 9b. ĐẶT / KHÔI PHỤC / HỦY ĐIỂM NĂNG ĐỘNG (PUT /api/v1/admin/users/{uid}/active-points)
    @PutMapping("/{id}/active-points")
    public ResponseEntity<ApiResponse<User>> setOrRestoreActivePoints(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        Object rawPoints = body.get("activePoints");
        if (!(rawPoints instanceof Number)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Giá trị điểm năng động không hợp lệ"));
        }
        int targetPoints = Math.max(0, ((Number) rawPoints).intValue());
        String reason = body.get("reason") != null ? String.valueOf(body.get("reason")) : "Admin điều chỉnh Điểm Năng Động";
        int prevPoints = user.getActivePoints();

        if (targetPoints < prevPoints && prevPoints > 0) {
            user.setPreviousActivePoints(prevPoints);
        }
        user.setActivePoints(targetPoints);
        user.setLastAntiCheatNote(reason);
        user.setUpdatedAt(java.time.Instant.now().toString());
        userRepository.save(user);
        try {
            userFirestoreRepository.saveUser(user);
        } catch (Exception ignored) {}

        leaderboardRepository.findByUserId(id).ifPresent(le -> {
            le.setActivePoints(targetPoints);
            leaderboardRepository.save(le);
        });

        activityLogRepository.record(actor(principal),
                targetPoints == 0 ? "ADMIN_RESET_ACTIVE_POINTS" : "ADMIN_SET_ACTIVE_POINTS",
                "USER", id,
                String.format("Đặt Điểm Năng Động từ %d -> %d AP. Lý do: %s", prevPoints, targetPoints, reason));

        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật Điểm Năng Động thành " + targetPoints + " AP", user));
    }

    // 10. THANH TRA HỒ SƠ HỌC VIÊN (GET /api/v1/admin/users/{uid}/learning-dossier)
    @GetMapping("/{id}/learning-dossier")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLearningDossier(@PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        List<UserProgress> progresses = userProgressRepository.findByUserId(id);
        List<UserSrsItem> srsItems = userSrsRepository.findByUserId(id);

        Map<String, Object> dossier = new HashMap<>();
        dossier.put("user", user);
        dossier.put("placementDetails", user.getPlacementDetails());
        dossier.put("progressList", progresses);
        dossier.put("totalMilestonesStarted", progresses.size());
        dossier.put("srsItemsQueue", srsItems);
        dossier.put("totalSrsItems", srsItems.size());

        return ResponseEntity.ok(ApiResponse.success("Lấy hồ sơ học tập học viên thành công", dossier));
    }
}
