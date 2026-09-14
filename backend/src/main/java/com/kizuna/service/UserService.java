package com.kizuna.service;

import com.kizuna.dto.request.LoginRequest;
import com.kizuna.dto.response.LoginResponse;
import com.kizuna.dto.response.UserResponse;
import com.kizuna.model.User;

public interface UserService {

    LoginResponse login(LoginRequest loginRequest);

    UserResponse getCurrentUser(String username);

    User findByUsername(String username);

    void initDefaultUsers();
}
