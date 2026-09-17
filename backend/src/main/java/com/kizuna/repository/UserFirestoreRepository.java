package com.kizuna.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.kizuna.model.User;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

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
        WriteResult result = firestore.collection(COLLECTION_NAME)
                .document(user.getId())
                .set(user).get();
        return user.getId();
    }

    // READ ALL (GET)
    public List<User> getAllUsers() throws ExecutionException, InterruptedException {
        ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME)
                .whereEqualTo("isDeleted", false) // Chỉ lấy các user chưa bị xóa
                .get();
        List<QueryDocumentSnapshot> documents = future.get().getDocuments();
        List<User> users = new ArrayList<>();
        for (DocumentSnapshot document : documents) {
            users.add(document.toObject(User.class));
        }
        return users;
    }

    // READ ONE (GET)
    public User getUserById(String id) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
        ApiFuture<DocumentSnapshot> future = docRef.get();
        DocumentSnapshot document = future.get();
        if (document.exists()) {
            return document.toObject(User.class);
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