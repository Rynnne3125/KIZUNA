package com.kizuna.service.impl;

import com.kizuna.dto.request.ProgressSubmitRequest;
import com.kizuna.dto.response.ProgressSummaryResponse;
import com.kizuna.model.UserProgress;
import com.kizuna.model.UserProfile;
import com.kizuna.repository.UserProgressRepository;
import com.kizuna.repository.UserRepository;
import com.kizuna.service.ProgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProgressServiceImpl implements ProgressService {

    private static final long MILLIS_PER_DAY = 24L * 60 * 60 * 1000;

    private final UserProgressRepository progressRepository;
    private final UserRepository userRepository;

    @Override
    public UserProgress recordProgress(String userId, ProgressSubmitRequest request) {
        String progressId = String.format("%s_%s_%s", userId, request.getItemType().toUpperCase(), request.getItemId());
        Optional<UserProgress> existingOpt = progressRepository.findById(progressId);

        UserProgress progress;
        Date now = new Date();
        int quality = request.getQuality();

        if (existingOpt.isPresent()) {
            progress = existingOpt.get();
        } else {
            progress = UserProgress.builder()
                    .id(progressId)
                    .userId(userId)
                    .itemId(request.getItemId())
                    .itemType(request.getItemType().toUpperCase())
                    .status("NEW")
                    .repetitionCount(0)
                    .intervalDays(1.0)
                    .easeFactor(2.5)
                    .createdAt(now)
                    .build();
        }

        if (request.getBookmarked() != null) {
            progress.setBookmarked(request.getBookmarked());
        }

        // Apply SuperMemo-2 (SM-2) Spaced Repetition calculation
        applySm2Algorithm(progress, quality, now);

        progress.setLastReviewedDate(now);
        progress.setUpdatedAt(now);

        progressRepository.save(progressId, progress);

        // Award XP to user profile
        updateUserExperienceAndStreak(userId, quality);

        return progress;
    }

    @Override
    public ProgressSummaryResponse getProgressSummary(String userId) {
        List<UserProgress> userProgressList = progressRepository.findByUserId(userId);
        Date now = new Date();

        int totalStudied = userProgressList.size();
        int dueCount = 0;
        int masteredCount = 0;
        int learningCount = 0;

        for (UserProgress p : userProgressList) {
            if ("MASTERED".equalsIgnoreCase(p.getStatus())) {
                masteredCount++;
            } else {
                learningCount++;
            }

            if (p.getNextReviewDate() != null && !p.getNextReviewDate().after(now)) {
                dueCount++;
            }
        }

        int streak = 0;
        long totalXp = 0;
        Optional<UserProfile> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            streak = userOpt.get().getDailyStreak();
            totalXp = userOpt.get().getTotalXp();
        }

        return ProgressSummaryResponse.builder()
                .totalStudied(totalStudied)
                .dueForReviewToday(dueCount)
                .masteredCount(masteredCount)
                .learningCount(learningCount)
                .dailyStreak(streak)
                .totalXp(totalXp)
                .build();
    }

    @Override
    public List<UserProgress> getDueReviews(String userId) {
        return progressRepository.findDueReviews(userId, new Date());
    }

    private void applySm2Algorithm(UserProgress progress, int quality, Date now) {
        int repetitions = progress.getRepetitionCount();
        double interval = progress.getIntervalDays();
        double easeFactor = progress.getEaseFactor();

        if (quality >= 3) {
            // Correct recall
            if (repetitions == 0) {
                interval = 1.0;
            } else if (repetitions == 1) {
                interval = 6.0;
            } else {
                interval = Math.round(interval * easeFactor);
            }
            repetitions++;
            progress.setCorrectStreak(progress.getCorrectStreak() + 1);

            if (repetitions >= 5) {
                progress.setStatus("MASTERED");
            } else {
                progress.setStatus("LEARNING");
            }
        } else {
            // Failed recall
            repetitions = 0;
            interval = 1.0;
            progress.setCorrectStreak(0);
            progress.setStatus("LEARNING");
        }

        // Calculate new Ease Factor (EF)
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        double newEf = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (newEf < 1.3) {
            newEf = 1.3; // SM-2 minimum ease factor
        }

        progress.setRepetitionCount(repetitions);
        progress.setIntervalDays(interval);
        progress.setEaseFactor(newEf);

        long nextReviewMillis = now.getTime() + (long) (interval * MILLIS_PER_DAY);
        progress.setNextReviewDate(new Date(nextReviewMillis));
    }

    private void updateUserExperienceAndStreak(String userId, int quality) {
        userRepository.findById(userId).ifPresent(user -> {
            long earnedXp = (quality >= 3) ? (quality == 5 ? 20 : 10) : 2;
            user.setTotalXp(user.getTotalXp() + earnedXp);
            user.setLastActiveDate(new Date());
            user.setUpdatedAt(new Date());
            userRepository.save(userId, user);
        });
    }
}
