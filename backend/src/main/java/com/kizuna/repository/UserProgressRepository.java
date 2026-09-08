package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.UserProgress;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public class UserProgressRepository extends AbstractFirestoreRepository<UserProgress> {

    public UserProgressRepository(Firestore firestore) {
        super(firestore, "user_progress", UserProgress.class);
    }

    public List<UserProgress> findByUserId(String userId) {
        return executeQuery(getCollection().whereEqualTo("userId", userId));
    }

    public List<UserProgress> findByUserIdAndItemType(String userId, String itemType) {
        return executeQuery(getCollection()
                .whereEqualTo("userId", userId)
                .whereEqualTo("itemType", itemType));
    }

    public List<UserProgress> findDueReviews(String userId, Date beforeDate) {
        return executeQuery(getCollection()
                .whereEqualTo("userId", userId)
                .whereLessThanOrEqualTo("nextReviewDate", beforeDate));
    }
}
