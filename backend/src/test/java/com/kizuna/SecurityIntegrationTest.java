package com.kizuna;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kizuna.dto.request.LoginRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Public Health Endpoint: GET /api/v1/health should return 200 without token")
    void healthCheckPublic() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("UP")))
                .andExpect(jsonPath("$.data.port", is(3000)));
    }

    @Test
    @DisplayName("Unauthenticated Access: GET /api/v1/admin/journey/overview without token should return 401")
    void unauthenticatedAccessToAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/journey/overview"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Unauthorized")));
    }

    @Test
    @DisplayName("Admin Flow: Login as ADMIN -> get token -> access admin overview (200)")
    void adminLoginAndAccess() throws Exception {
        // 1. Login as admin
        LoginRequest loginRequest = new LoginRequest("admin", "admin123");
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.role", is("ROLE_ADMIN")))
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody).path("data").path("token").asText();

        // 2. Access Admin Endpoint with Admin Bearer Token
        mockMvc.perform(get("/api/v1/admin/journey/overview")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.adminUsername", is("admin")))
                .andExpect(jsonPath("$.data.status", is("ADMIN_ACCESS_GRANTED")));
    }

    @Test
    @DisplayName("User Flow: Login as USER -> get token -> access user progress (200)")
    void userLoginAndAccess() throws Exception {
        // 1. Login as user
        LoginRequest loginRequest = new LoginRequest("user", "user123");
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.role", is("ROLE_USER")))
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody).path("data").path("token").asText();

        // 2. Access User Endpoint with User Bearer Token
        mockMvc.perform(get("/api/v1/user/journey/progress")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.username", is("user")))
                .andExpect(jsonPath("$.data.status", is("USER_ACCESS_GRANTED")));

        // 3. User tries to access Admin Endpoint -> Should return 403 Forbidden
        mockMvc.perform(get("/api/v1/admin/journey/overview")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Forbidden")));
    }
}
