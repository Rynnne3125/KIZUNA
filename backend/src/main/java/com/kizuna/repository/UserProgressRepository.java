package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.UserProgress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class UserProgressRepository {

    private static final Logger logger = LoggerFactory.getLogger(UserProgressRepository.class);
    private static final String COLLECTION_NAME = "user_progress";

    private final Firestore firestore;
    // Fast in-memory cache for progress isolation
    private final Map<String, UserProgress> progressStorage = new ConcurrentHashMap<>();

    public UserProgressRepository(@Autowired(required = false) Firestore firestore) {
        this.firestore = firestore;
    }

    public Optional<UserProgress> findByUserIdAndMilestoneId(String userId, String milestoneId) {
        String key = userId + "_" + milestoneId;
        UserProgress progress = progressStorage.get(key);
        if (progress != null) {
            return Optional.of(progress);
        }

        if (firestore != null) {
            try {
                var doc = firestore.collection(COLLECTION_NAME).document(key).get().get();
                if (doc.exists()) {
                    UserProgress fetched = doc.toObject(UserProgress.class);
                    if (fetched != null) {
                        progressStorage.put(key, fetched);
                        return Optional.of(fetched);
                    }
                }
            } catch (Exception e) {
                logger.debug("Firestore fetch for user_progress key '{}' failed: {}", key, e.getMessage());
            }
        }

        return Optional.empty();
    }

    public List<UserProgress> findByUserId(String userId) {
        return progressStorage.values().stream()
                .filter(p -> userId.equalsIgnoreCase(p.getUserId()))
                .collect(Collectors.toList());
    }

    public UserProgress save(UserProgress progress) {
        if (progress.getId() == null || progress.getId().isBlank()) {
            progress.setId(progress.getUserId() + "_" + progress.getMilestoneId());
        }
        progressStorage.put(progress.getId(), progress);

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(progress.getId()).set(progress);
            } catch (Exception e) {
                logger.debug("Firestore persist for user_progress key '{}' skipped: {}", progress.getId(), e.getMessage());
            }
        }
        return progress;
    }

    public void delete(String userId, String milestoneId) {
        String key = userId + "_" + milestoneId;
        progressStorage.remove(key);
        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(key).delete();
            } catch (Exception e) {
                logger.debug("Firestore delete for user_progress key '{}' skipped: {}", key, e.getMessage());
            }
        }
    }
}
