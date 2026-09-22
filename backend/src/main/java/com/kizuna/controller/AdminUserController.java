package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.AntiCheatAdjustPointsRequest;
import com.kizuna.dto.request.UserRoleRequest;
import com.kizuna.dto.request.UserStatusRequest;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.LeaderboardEntry;
import com.kizuna.model.User;
import com.kizuna.model.UserProgress;
import com.kizuna.model.UserSrsItem;
import com.kizuna.repository.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    public AdminUserController(UserFirestoreRepository userFirestoreRepository,
                               UserRepository userRepository,
                               UserProgressRepository userProgressRepository,
                               UserSrsRepository userSrsRepository,
                               LeaderboardRepository leaderboardRepository) {
        this.userFirestoreRepository = userFirestoreRepository;
        this.userRepository = userRepository;
        this.userProgressRepository = userProgressRepository;
        this.userSrsRepository = userSrsRepository;
        this.leaderboardRepository = leaderboardRepository;
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
    public ResponseEntity<ApiResponse<User>> createUser(@RequestBody User user) {
        try {
            String id = userFirestoreRepository.saveUser(user);
            user.setId(id);
            userRepository.save(user);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Tạo người dùng mới thành công trên Firestore", user));
        } catch (Exception e) {
            userRepository.save(user);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Tạo người dùng thành công (bộ nhớ)", user));
        }
    }

    // 4. UPDATE (PUT)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> updateUser(@PathVariable String id, @RequestBody User user) {
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
            return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", user));
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            user.setId(id);
            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("Cập nhật người dùng thành công", user));
        }
    }

    // 5. SOFT DELETE (DELETE - Chuyển cờ isDeleted = true)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable String id) {
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

        user.setRole(request.getRole());
        userRepository.save(user);
        try {
            userFirestoreRepository.saveUser(user);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò người dùng thành " + request.getRole() + " thành công", user));
    }

    // 7. KHÓA / MỞ KHÓA TÀI KHOẢN (PUT /api/v1/admin/users/{uid}/status)
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<User>> updateUserStatus(
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
        return ResponseEntity.ok(ApiResponse.success(statusMsg, user));
    }

    // 8. CHỐNG GIAN LẬN: RESET STREAK (POST /api/v1/admin/users/{uid}/reset-streak)
    @PostMapping("/{id}/reset-streak")
    public ResponseEntity<ApiResponse<User>> resetStreak(@PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            try {
                user = userFirestoreRepository.getUserById(id);
            } catch (Exception ignored) {}
        }
        if (user == null || user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id);
        }

        user.setCurrentStreak(0);
        userRepository.save(user);
        leaderboardRepository.findByUserId(id).ifPresent(le -> {
            le.setCurrentStreak(0);
            leaderboardRepository.save(le);
        });

        return ResponseEntity.ok(ApiResponse.success("Đã reset chuỗi streak của người dùng về 0", user));
    }

    // 9. ĐIỀU CHỈNH ĐIỂM NĂNG ĐỘNG (POST /api/v1/admin/users/{uid}/adjust-points)
    @PostMapping("/{id}/adjust-points")
    public ResponseEntity<ApiResponse<User>> adjustPoints(
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

        int newPoints = Math.max(0, user.getActivePoints() + request.getPointsAdjustment());
        user.setActivePoints(newPoints);
        userRepository.save(user);

        leaderboardRepository.findByUserId(id).ifPresent(le -> {
            le.setActivePoints(newPoints);
            leaderboardRepository.save(le);
        });

        return ResponseEntity.ok(ApiResponse.success("Điều chỉnh điểm thành công. Điểm mới: " + newPoints, user));
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
        dossier.put("progressList", progresses);
        dossier.put("totalMilestonesStarted", progresses.size());
        dossier.put("srsItemsQueue", srsItems);
        dossier.put("totalSrsItems", srsItems.size());

        return ResponseEntity.ok(ApiResponse.success("Lấy hồ sơ học tập học viên thành công", dossier));
    }
}
