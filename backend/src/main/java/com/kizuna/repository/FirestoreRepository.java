package com.kizuna.repository;

import java.util.List;
import java.util.Optional;

public interface FirestoreRepository<T> {

    T save(String id, T entity);

    Optional<T> findById(String id);

    List<T> findAll(int limit);

    boolean deleteById(String id);

    boolean existsById(String id);
}
