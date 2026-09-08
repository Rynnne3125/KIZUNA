package com.kizuna.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {

    private List<T> items;
    private int limit;
    private String nextCursor; // For Firestore cursor-based pagination
    private boolean hasMore;
    private long total;

    public static <T> PageResponse<T> of(List<T> items, int limit, String nextCursor, boolean hasMore) {
        return PageResponse.<T>builder()
                .items(items)
                .limit(limit)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .total(items.size())
                .build();
    }
}
