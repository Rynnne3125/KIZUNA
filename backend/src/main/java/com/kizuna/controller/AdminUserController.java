package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.model.User;
import com.kizuna.repository.UserFirestoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final UserFirestoreRepository userFirestoreRepository;

    public AdminUserController(UserFirestoreRepository userFirestoreRepository) {
        this.userFirestoreRepository = userFirestoreRepository;
    }

    // 1. GET ALL (READ ALL - Chỉ lấy user chưa xóa)
    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        try {
            List<User> users = userFirestoreRepository.getAllUsers();
            return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", users));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách người dùng: " + e.getMessage()));
        }
    }

    // 2. GET BY ID (READ ONE)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable String id) {
        try {
            User user = userFirestoreRepository.getUserById(id);
            if (user == null || user.isDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy người dùng với ID: " + id));
            }
            return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", user));
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
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Tạo người dùng mới thành công trên Firestore", user));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi tạo người dùng: " + e.getMessage()));
        }
    }

    // 4. UPDATE (PUT)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> updateUser(@PathVariable String id, @RequestBody User user) {
        try {
            User existing = userFirestoreRepository.getUserById(id);
            if (existing == null || existing.isDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy người dùng với ID: " + id + " để cập nhật"));
            }
            user.setId(id);
            userFirestoreRepository.saveUser(user);
            return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", user));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi cập nhật người dùng: " + e.getMessage()));
        }
    }

    // 5. SOFT DELETE (DELETE - Chuyển cờ isDeleted = true)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable String id) {
        try {
            User existing = userFirestoreRepository.getUserById(id);
            if (existing == null || existing.isDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy người dùng với ID: " + id + " để xóa"));
            }
            userFirestoreRepository.softDeleteUser(id);
            return ResponseEntity.ok(ApiResponse.success("Xóa mềm người dùng thành công (isDeleted = true)", id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi xóa người dùng: " + e.getMessage()));
        }
    }
}
