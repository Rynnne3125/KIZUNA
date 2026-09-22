package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.UserSrsItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class UserSrsRepository {

    private static final Logger logger = LoggerFactory.getLogger(UserSrsRepository.class);
    private static final String COLLECTION_NAME = "user_srs_items";

    private final Firestore firestore;
    private final Map<String, UserSrsItem> srsStorage = new ConcurrentHashMap<>();

    public UserSrsRepository(@Autowired(required = false) Firestore firestore) {
        this.firestore = firestore;
    }

    public List<UserSrsItem> findDueItems(String userId, Long timestamp) {
        return srsStorage.values().stream()
                .filter(item -> userId.equalsIgnoreCase(item.getUserId()))
                .filter(item -> item.getNextReviewDate() != null && item.getNextReviewDate() <= timestamp)
                .sorted(Comparator.comparing(UserSrsItem::getNextReviewDate))
                .collect(Collectors.toList());
    }

    public List<UserSrsItem> findByUserId(String userId) {
        return srsStorage.values().stream()
                .filter(item -> userId.equalsIgnoreCase(item.getUserId()))
                .collect(Collectors.toList());
    }

    public Optional<UserSrsItem> findByUserIdAndItemId(String userId, String itemId) {
        String key = userId + "_" + itemId;
        return Optional.ofNullable(srsStorage.get(key));
    }

    public UserSrsItem save(UserSrsItem item) {
        if (item.getId() == null || item.getId().isBlank()) {
            item.setId(item.getUserId() + "_" + item.getItemId());
        }
        srsStorage.put(item.getId(), item);

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(item.getId()).set(item);
            } catch (Exception e) {
                logger.debug("Firestore persist for user_srs_items skipped: {}", e.getMessage());
            }
        }
        return item;
    }
}
