package com.kizuna.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.kizuna.model.User;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

@Repository
public class UserFirestoreRepository {

    private final Firestore firestore;
    private static final String COLLECTION_NAME = "users";

    public UserFirestoreRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    // CREATE / UPDATE
    public String saveUser(User user) throws ExecutionException, InterruptedException {
        if (user.getId() == null || user.getId().isBlank()) {
            user.setId(String.valueOf(System.currentTimeMillis()));
        }
        firestore.collection(COLLECTION_NAME)
                .document(user.getId())
                .set(user).get();
        return user.getId();
    }

    // READ ALL (GET)
    public List<User> getAllUsers() throws ExecutionException, InterruptedException {
        ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME)
                .whereEqualTo("isDeleted", false)
                .get();
        List<QueryDocumentSnapshot> documents = future.get().getDocuments();
        List<User> users = new ArrayList<>();
        for (DocumentSnapshot document : documents) {
            User u = document.toObject(User.class);
            if (u != null) {
                if (u.getId() == null || u.getId().isBlank()) u.setId(document.getId());
                users.add(u);
            }
        }
        return users;
    }

    // READ ONE (GET)
    public User getUserById(String id) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
        ApiFuture<DocumentSnapshot> future = docRef.get();
        DocumentSnapshot document = future.get();
        if (document.exists()) {
            User u = document.toObject(User.class);
            if (u != null && (u.getId() == null || u.getId().isBlank())) {
                u.setId(document.getId());
            }
            return u;
        }
        return null;
    }

    // FIND BY EMAIL OR USERNAME
    public User findByEmailOrUsername(String identifier) {
        if (firestore == null || identifier == null || identifier.isBlank()) return null;
        String clean = identifier.trim().toLowerCase();
        try {
            var snapEmail = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("email", clean)
                    .limit(1)
                    .get()
                    .get(3, TimeUnit.SECONDS);
            if (!snapEmail.isEmpty()) {
                DocumentSnapshot doc = snapEmail.getDocuments().get(0);
                User u = doc.toObject(User.class);
                if (u != null) {
                    if (u.getId() == null || u.getId().isBlank()) u.setId(doc.getId());
                    return u;
                }
            }
            var snapUser = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("username", clean)
                    .limit(1)
                    .get()
                    .get(3, TimeUnit.SECONDS);
            if (!snapUser.isEmpty()) {
                DocumentSnapshot doc = snapUser.getDocuments().get(0);
                User u = doc.toObject(User.class);
                if (u != null) {
                    if (u.getId() == null || u.getId().isBlank()) u.setId(doc.getId());
                    return u;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    // SOFT DELETE
    public void softDeleteUser(String id) throws ExecutionException, InterruptedException {
        firestore.collection(COLLECTION_NAME)
                .document(id)
                .update("isDeleted", true)
                .get();
    }
}
