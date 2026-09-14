package com.kizuna.repository;

import com.kizuna.model.User;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

@Repository
public class UserRepository {

    private final Map<String, User> userStorage = new ConcurrentHashMap<>();

    public Optional<User> findByUsername(String username) {
        return userStorage.values().stream()
                .filter(u -> u.getUsername().equalsIgnoreCase(username))
                .findFirst();
    }

    public Optional<User> findById(String id) {
        return Optional.ofNullable(userStorage.get(id));
    }

    public boolean existsByUsername(String username) {
        return userStorage.values().stream()
                .anyMatch(u -> u.getUsername().equalsIgnoreCase(username));
    }

    public User save(User user) {
        if (user.getId() == null || user.getId().isBlank()) {
            user.setId(String.valueOf(System.currentTimeMillis()));
        }
        userStorage.put(user.getId(), user);
        return user;
    }

    public List<User> findAll() {
        return new ArrayList<>(userStorage.values());
    }

}
