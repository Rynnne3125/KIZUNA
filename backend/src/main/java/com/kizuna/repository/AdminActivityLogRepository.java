package com.kizuna.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.kizuna.model.AdminActivityLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Repository
public class AdminActivityLogRepository {

    private static final Logger logger = LoggerFactory.getLogger(AdminActivityLogRepository.class);
    private static final String COLLECTION_NAME = "admin_activity_logs";
    private static final int MAX_MEMORY_LOGS = 500;

    private final Firestore firestore;
    private final CopyOnWriteArrayList<AdminActivityLog> logs = new CopyOnWriteArrayList<>();

    public AdminActivityLogRepository(@Autowired(required = false) Firestore firestore) {
        this.firestore = firestore;
    }

    public AdminActivityLog record(String adminUsername, String action, String targetType, String targetId, String details) {
        String id = "act_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6);
        AdminActivityLog entry = new AdminActivityLog(
                id,
                adminUsername != null && !adminUsername.isBlank() ? adminUsername : "admin",
                action,
                targetType,
                targetId != null ? targetId : "",
                details != null ? details : "",
                Instant.now().toString()
        );
        logs.add(0, entry);
        while (logs.size() > MAX_MEMORY_LOGS) {
            logs.remove(logs.size() - 1);
        }

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(id).set(entry);
            } catch (Exception e) {
                logger.debug("Firestore persist for admin_activity_logs skipped: {}", e.getMessage());
            }
        }
        return entry;
    }

    public List<AdminActivityLog> findRecent(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 500));
        if (logs.isEmpty() && firestore != null) {
            try {
                List<AdminActivityLog> remote = new ArrayList<>();
                var docs = firestore.collection(COLLECTION_NAME).limit(safeLimit).get().get(3, TimeUnit.SECONDS).getDocuments();
                for (DocumentSnapshot doc : docs) {
                    AdminActivityLog item = doc.toObject(AdminActivityLog.class);
                    if (item != null) {
                        if (item.getId() == null) item.setId(doc.getId());
                        remote.add(item);
                    }
                }
                remote.sort(Comparator.comparing(AdminActivityLog::getTimestamp, Comparator.nullsLast(Comparator.reverseOrder())));
                return remote.stream().limit(safeLimit).collect(Collectors.toList());
            } catch (Exception e) {
                logger.debug("Firestore read for admin_activity_logs skipped: {}", e.getMessage());
            }
        }
        return logs.stream().limit(safeLimit).collect(Collectors.toList());
    }
}
