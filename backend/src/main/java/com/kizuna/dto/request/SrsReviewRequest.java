package com.kizuna.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class SrsReviewRequest {

    @NotNull(message = "quality rating is required")
    @Min(value = 0, message = "quality must be between 0 (complete blackout) and 5 (perfect recall)")
    @Max(value = 5, message = "quality must be between 0 and 5")
    private Integer quality;

    public SrsReviewRequest() {}

    public SrsReviewRequest(Integer quality) {
        this.quality = quality;
    }

    public Integer getQuality() { return quality; }
    public void setQuality(Integer quality) { this.quality = quality; }
}
