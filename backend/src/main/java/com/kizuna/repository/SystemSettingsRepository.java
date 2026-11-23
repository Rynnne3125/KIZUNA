package com.kizuna.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.kizuna.model.SystemSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.concurrent.TimeUnit;

@Repository
public class SystemSettingsRepository {

    private static final Logger logger = LoggerFactory.getLogger(SystemSettingsRepository.class);
    private static final String COLLECTION = "system_config";
    private static final String DOC_ID = "settings";

    private final Firestore firestore;
    private final SystemSettings current = new SystemSettings();

    public SystemSettingsRepository(@Autowired(required = false) Firestore firestore) {
        this.firestore = firestore;
        this.current.setUpdatedAt(Instant.now().toString());
        loadFromFirestoreIfPossible();
    }

    private void loadFromFirestoreIfPossible() {
        if (firestore == null) return;
        try {
            DocumentSnapshot doc = firestore.collection(COLLECTION).document(DOC_ID).get().get(2, TimeUnit.SECONDS);
            if (doc.exists()) {
                SystemSettings remote = doc.toObject(SystemSettings.class);
                if (remote != null) {
                    copyInto(remote, current);
                }
            }
        } catch (Exception e) {
            logger.debug("Skipping remote system settings load (non-fatal): {}", e.getMessage());
        }
    }

    public synchronized SystemSettings getSettings() {
        SystemSettings copy = new SystemSettings();
        copyInto(current, copy);
        return copy;
    }

    public synchronized SystemSettings save(SystemSettings updated, String adminUsername) {
        current.setMaintenanceMode(updated.isMaintenanceMode());
        if (updated.getMaintenanceMessage() != null && !updated.getMaintenanceMessage().isBlank()) {
            current.setMaintenanceMessage(updated.getMaintenanceMessage().trim());
        }
        current.setAllowNewRegistrations(updated.isAllowNewRegistrations());
        current.setAiSenseiEnabled(updated.isAiSenseiEnabled());
        current.setUpdatedBy(adminUsername != null ? adminUsername : "admin");
        current.setUpdatedAt(Instant.now().toString());

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION).document(DOC_ID).set(current);
            } catch (Exception e) {
                logger.debug("Firestore persist for system settings skipped: {}", e.getMessage());
            }
        }
        return getSettings();
    }

    private static void copyInto(SystemSettings src, SystemSettings dst) {
        dst.setMaintenanceMode(src.isMaintenanceMode());
        if (src.getMaintenanceMessage() != null) dst.setMaintenanceMessage(src.getMaintenanceMessage());
        dst.setAllowNewRegistrations(src.isAllowNewRegistrations());
        dst.setAiSenseiEnabled(src.isAiSenseiEnabled());
        dst.setUpdatedBy(src.getUpdatedBy());
        dst.setUpdatedAt(src.getUpdatedAt());
    }
}
