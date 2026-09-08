package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.UserProfile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository extends AbstractFirestoreRepository<UserProfile> {

    public UserRepository(Firestore firestore) {
        super(firestore, "users", UserProfile.class);
    }

    public Optional<UserProfile> findByEmail(String email) {
        List<UserProfile> results = executeQuery(getCollection().whereEqualTo("email", email).limit(1));
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }
}
