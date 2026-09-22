package com.kizuna;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kizuna.dto.request.LoginRequest;
import com.kizuna.model.User;
import com.kizuna.repository.UserFirestoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AdminUserCrudIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserFirestoreRepository userFirestoreRepository;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() throws Exception {
        // Đăng nhập Admin lấy Bearer Token
        LoginRequest adminLogin = new LoginRequest("admin", "admin123");
        MvcResult adminResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readTree(adminResult.getResponse().getContentAsString())
                .path("data").path("token").asText();

        // Đăng nhập User thường lấy Bearer Token
        LoginRequest userLogin = new LoginRequest("user", "user123");
        MvcResult userResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLogin)))
                .andExpect(status().isOk())
                .andReturn();
        userToken = objectMapper.readTree(userResult.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    @Test
    @DisplayName("Security Check: Chưa đăng nhập truy cập /api/v1/admin/users phải trả về 401")
    void unauthenticatedAccessShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security Check: User thường truy cập /api/v1/admin/users phải trả về 403 Forbidden")
    void roleUserAccessShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CRUD 1: Admin lấy toàn bộ danh sách users (GET /api/v1/admin/users) -> 200 OK")
    void adminGetAllUsersSuccess() throws Exception {
        User u1 = new User("u1", "tanaka", "pass1", "Tanaka Ken", "tanaka@vku.udn.vn", "ROLE_USER", true);
        User u2 = new User("u2", "yamada", "pass2", "Yamada Taro", "yamada@vku.udn.vn", "ROLE_USER", true);
        when(userFirestoreRepository.getAllUsers()).thenReturn(Arrays.asList(u1, u2));

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].username", is("tanaka")))
                .andExpect(jsonPath("$.data[1].username", is("yamada")));
    }

    @Test
    @DisplayName("CRUD 2: Admin lấy chi tiết user theo ID (GET /api/v1/admin/users/{id}) -> 200 OK")
    void adminGetUserByIdSuccess() throws Exception {
        User u1 = new User("user-100", "sakura", "pass123", "Sakura Haruno", "sakura@vku.udn.vn", "ROLE_USER", true);
        when(userFirestoreRepository.getUserById("user-100")).thenReturn(u1);

        mockMvc.perform(get("/api/v1/admin/users/user-100")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is("user-100")))
                .andExpect(jsonPath("$.data.fullName", is("Sakura Haruno")));
    }

    @Test
    @DisplayName("CRUD 3: Admin tạo mới user (POST /api/v1/admin/users) -> 201 Created")
    void adminCreateUserSuccess() throws Exception {
        User newUser = new User(null, "newstudent", "pass123", "Sinh Vien Moi", "student@vku.udn.vn", "ROLE_USER", true);
        when(userFirestoreRepository.saveUser(any(User.class))).thenReturn("generated-id-888");

        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is("generated-id-888")))
                .andExpect(jsonPath("$.data.username", is("newstudent")));
    }

    @Test
    @DisplayName("CRUD 4: Admin cập nhật thông tin user (PUT /api/v1/admin/users/{id}) -> 200 OK")
    void adminUpdateUserSuccess() throws Exception {
        User existing = new User("user-100", "sakura", "pass123", "Sakura Cu", "sakura@vku.udn.vn", "ROLE_USER", true);
        User updated = new User("user-100", "sakura", "pass123", "Sakura Moi", "sakura.new@vku.udn.vn", "ROLE_USER", true);
        when(userFirestoreRepository.getUserById("user-100")).thenReturn(existing);
        when(userFirestoreRepository.saveUser(any(User.class))).thenReturn("user-100");

        mockMvc.perform(put("/api/v1/admin/users/user-100")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.fullName", is("Sakura Moi")));
    }

    @Test
    @DisplayName("CRUD 5: Admin xóa mềm user (DELETE /api/v1/admin/users/{id}) -> 200 OK")
    void adminDeleteUserSuccess() throws Exception {
        User existing = new User("user-100", "sakura", "pass123", "Sakura", "sakura@vku.udn.vn", "ROLE_USER", true);
        when(userFirestoreRepository.getUserById("user-100")).thenReturn(existing);
        doNothing().when(userFirestoreRepository).softDeleteUser("user-100");

        mockMvc.perform(delete("/api/v1/admin/users/user-100")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", containsString("Xóa mềm người dùng thành công")));
    }
}
