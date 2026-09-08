package com.kizuna.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.kizuna.common.ErrorCode;
import com.kizuna.exception.AppException;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Slf4j
public abstract class AbstractFirestoreRepository<T> implements FirestoreRepository<T> {

    protected final Firestore firestore;
    protected final String collectionName;
    protected final Class<T> entityClass;

    protected AbstractFirestoreRepository(Firestore firestore, String collectionName, Class<T> entityClass) {
        this.firestore = firestore;
        this.collectionName = collectionName;
        this.entityClass = entityClass;
    }

    protected CollectionReference getCollection() {
        return firestore.collection(collectionName);
    }

    @Override
    public T save(String id, T entity) {
        try {
            DocumentReference docRef = getCollection().document(id);
            ApiFuture<WriteResult> future = docRef.set(entity);
            future.get(); // Wait for write confirmation
            return entity;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Interrupted while saving entity to Firestore");
        } catch (ExecutionException e) {
            log.error("Error saving document to collection {}: {}", collectionName, e.getMessage());
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Failed to save entity to Firestore: " + e.getMessage());
        }
    }

    @Override
    public Optional<T> findById(String id) {
        try {
            DocumentReference docRef = getCollection().document(id);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();
            if (document.exists()) {
                return Optional.ofNullable(document.toObject(entityClass));
            }
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Interrupted while reading entity from Firestore");
        } catch (ExecutionException e) {
            log.error("Error fetching document {} from collection {}: {}", id, collectionName, e.getMessage());
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Failed to fetch entity from Firestore: " + e.getMessage());
        }
    }

    @Override
    public List<T> findAll(int limit) {
        try {
            Query query = getCollection().limit(limit > 0 ? limit : 50);
            ApiFuture<QuerySnapshot> future = query.get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            List<T> list = new ArrayList<>();
            for (DocumentSnapshot doc : documents) {
                T item = doc.toObject(entityClass);
                if (item != null) {
                    list.add(item);
                }
            }
            return list;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Interrupted while reading collection from Firestore");
        } catch (ExecutionException e) {
            log.error("Error listing documents from collection {}: {}", collectionName, e.getMessage());
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Failed to list entities from Firestore: " + e.getMessage());
        }
    }

    @Override
    public boolean deleteById(String id) {
        try {
            DocumentReference docRef = getCollection().document(id);
            ApiFuture<WriteResult> future = docRef.delete();
            future.get();
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Interrupted while deleting entity from Firestore");
        } catch (ExecutionException e) {
            log.error("Error deleting document {} from collection {}: {}", id, collectionName, e.getMessage());
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Failed to delete entity from Firestore: " + e.getMessage());
        }
    }

    @Override
    public boolean existsById(String id) {
        return findById(id).isPresent();
    }

    protected List<T> executeQuery(Query query) {
        try {
            ApiFuture<QuerySnapshot> future = query.get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            List<T> list = new ArrayList<>();
            for (DocumentSnapshot doc : documents) {
                T item = doc.toObject(entityClass);
                if (item != null) {
                    list.add(item);
                }
            }
            return list;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Interrupted while executing Firestore query");
        } catch (ExecutionException e) {
            log.error("Error executing query on collection {}: {}", collectionName, e.getMessage());
            throw new AppException(ErrorCode.FIREBASE_ERROR, "Firestore query failed: " + e.getMessage());
        }
    }
}
