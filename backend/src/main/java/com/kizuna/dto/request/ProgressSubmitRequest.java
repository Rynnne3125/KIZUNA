package com.kizuna.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressSubmitRequest {

    @NotBlank(message = "Item ID is required")
    private String itemId;

    @NotBlank(message = "Item type is required (KANJI, VOCABULARY)")
    private String itemType;

    /**
     * Quality rating 0 to 5 (SuperMemo-2 SRS algorithm standard):
     * 5: perfect response
     * 4: correct response after a hesitation
     * 3: correct response recalled with serious difficulty
     * 2: incorrect response; where the correct one seemed easy to recall
     * 1: incorrect response; the correct one remembered
     * 0: complete blackout
     */
    @Min(value = 0, message = "Quality must be at least 0")
    @Max(value = 5, message = "Quality must be at most 5")
    private int quality;

    private Boolean bookmarked;
}
