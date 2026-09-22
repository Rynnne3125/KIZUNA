package com.kizuna.service.impl;

import com.kizuna.dto.request.QuestSubmitRequest;
import com.kizuna.dto.response.*;
import com.kizuna.exception.BadRequestException;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.*;
import com.kizuna.repository.*;
import com.kizuna.service.UserProgressService;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserProgressServiceImpl implements UserProgressService {

    private final UserProgressRepository userProgressRepository;
    private final CurriculumRepository curriculumRepository;
    private final UserRepository userRepository;
    private final UserSrsRepository userSrsRepository;
    private final LeaderboardRepository leaderboardRepository;

    public UserProgressServiceImpl(UserProgressRepository userProgressRepository,
                                  CurriculumRepository curriculumRepository,
                                  UserRepository userRepository,
                                  UserSrsRepository userSrsRepository,
                                  LeaderboardRepository leaderboardRepository) {
        this.userProgressRepository = userProgressRepository;
        this.curriculumRepository = curriculumRepository;
        this.userRepository = userRepository;
        this.userSrsRepository = userSrsRepository;
        this.leaderboardRepository = leaderboardRepository;
    }

    @Override
    public JourneyMapResponse getJourneyMap(String userId, String username) {
        List<Stage> stages = curriculumRepository.getAllStages();
        List<Milestone> allMilestones = curriculumRepository.getAllMilestones();
        List<UserProgress> userProgresses = userProgressRepository.findByUserId(userId);
        Map<String, UserProgress> progressMap = userProgresses.stream()
                .collect(Collectors.toMap(UserProgress::getMilestoneId, p -> p, (a, b) -> a));

        // If user has no progress records at all, automatically unlock Milestone 1
        if (progressMap.isEmpty() && !allMilestones.isEmpty()) {
            Milestone firstMilestone = allMilestones.get(0);
            UserProgress initialProgress = new UserProgress(userId, firstMilestone.getId(), "UNLOCKED");
            initialProgress.setCurrentQuestIndex(1);
            userProgressRepository.save(initialProgress);
            progressMap.put(firstMilestone.getId(), initialProgress);
        }

        List<StageWithMilestonesDto> stageDtos = new ArrayList<>();
        for (Stage stage : stages) {
            StageWithMilestonesDto stageDto = new StageWithMilestonesDto(
                    stage.getId(), stage.getTitle(), stage.getOrderIndex(), stage.getDescription(), stage.getThemeColor()
            );

            List<Milestone> stageMilestones = curriculumRepository.getMilestonesByStageId(stage.getId());
            List<MilestoneProgressDto> milestoneDtos = new ArrayList<>();

            for (Milestone m : stageMilestones) {
                MilestoneProgressDto mDto = new MilestoneProgressDto();
                mDto.setId(m.getId());
                mDto.setStageId(m.getStageId());
                mDto.setTitle(m.getTitle());
                mDto.setNejUnit(m.getNejUnit());
                mDto.setOrderIndex(m.getOrderIndex());
                mDto.setCommunicationContext(m.getCommunicationContext());
                mDto.setXpReward(m.getXpReward());
                mDto.setActivePointsReward(m.getActivePointsReward());
                mDto.setTotalQuests(4);

                UserProgress up = progressMap.get(m.getId());
                if (up != null) {
                    mDto.setStatus(up.getStatus());
                    mDto.setCompletedQuestsCount(up.getCompletedQuests().size());
                    mDto.setCurrentQuestIndex(up.getCurrentQuestIndex());
                    mDto.setVocabMasteryRate(up.getVocabMasteryRate());
                } else {
                    mDto.setStatus("LOCKED");
                    mDto.setCompletedQuestsCount(0);
                    mDto.setCurrentQuestIndex(1);
                    mDto.setVocabMasteryRate(0.0);
                }
                milestoneDtos.add(mDto);
            }
            stageDto.setMilestones(milestoneDtos);
            stageDtos.add(stageDto);
        }

        // Get user details
        User user = userRepository.findById(userId).or(() -> userRepository.findByUsername(username)).orElse(null);
        int streak = user != null ? user.getCurrentStreak() : 0;
        int xp = user != null ? user.getTotalXp() : 0;
        int activePoints = user != null ? user.getActivePoints() : 0;

        return new JourneyMapResponse(username, streak, xp, activePoints, stageDtos);
    }

    @Override
    public List<MilestoneQuest> getMilestoneQuestsForUser(String userId, String milestoneId) {
        Milestone milestone = curriculumRepository.getMilestoneById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with id: " + milestoneId));

        UserProgress progress = userProgressRepository.findByUserIdAndMilestoneId(userId, milestoneId)
                .orElse(null);

        if (progress == null || "LOCKED".equalsIgnoreCase(progress.getStatus())) {
            throw new BadRequestException("Cột mốc '" + milestone.getTitle() + "' đang bị khóa! Vui lòng hoàn thành các mốc trước.");
        }

        return curriculumRepository.getQuestsByMilestoneId(milestoneId);
    }

    @Override
    public QuestSubmitResult submitQuest(String userId, String username, String milestoneId, int questIndex, QuestSubmitRequest request) {
        Milestone milestone = curriculumRepository.getMilestoneById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with id: " + milestoneId));

        UserProgress progress = userProgressRepository.findByUserIdAndMilestoneId(userId, milestoneId)
                .orElse(null);

        if (progress == null || "LOCKED".equalsIgnoreCase(progress.getStatus())) {
            throw new BadRequestException("Không thể nộp bài! Mốc '" + milestone.getTitle() + "' đang ở trạng thái LOCKED.");
        }

        // Calculate rewards per quest
        int xpGained;
        int apGained;
        switch (questIndex) {
            case 1:
                xpGained = 25;
                apGained = 10;
                break;
            case 2:
                xpGained = 35;
                apGained = 15;
                // If any words were failed in gatekeeper, push to user_srs_items
                if (request.getFailedItemIds() != null && !request.getFailedItemIds().isEmpty()) {
                    for (String failedWordId : request.getFailedItemIds()) {
                        UserSrsItem srsItem = userSrsRepository.findByUserIdAndItemId(userId, failedWordId)
                                .orElse(new UserSrsItem(userId, "VOCABULARY", failedWordId));
                        srsItem.setFailedCount(srsItem.getFailedCount() + 1);
                        srsItem.setFailedQueue(true);
                        srsItem.setNextReviewDate(System.currentTimeMillis() + 86400000L); // Next day
                        userSrsRepository.save(srsItem);
                    }
                }
                break;
            case 3:
                xpGained = 45;
                apGained = 20;
                break;
            case 4:
                xpGained = 50;
                apGained = 25;
                break;
            default:
                throw new BadRequestException("Quest index must be between 1 and 4.");
        }

        // Update UserProgress (isolated in user_progress collection, never touches master seed!)
        String questKey = "quest_" + questIndex;
        if (!progress.getCompletedQuests().contains(questKey)) {
            progress.getCompletedQuests().add(questKey);
        }
        progress.setActivePointsEarned(progress.getActivePointsEarned() + apGained);
        progress.setLastReviewedAt(System.currentTimeMillis());

        if (request.getVocabMasteryRate() != null) {
            progress.setVocabMasteryRate(request.getVocabMasteryRate());
        }

        boolean milestoneCompleted = false;
        String nextMilestoneId = null;
        boolean nextMilestoneUnlocked = false;

        if (questIndex < 4) {
            progress.setStatus("IN_PROGRESS");
            progress.setCurrentQuestIndex(questIndex + 1);
        } else {
            // Completed quest 4 -> Finish milestone!
            progress.setStatus("COMPLETED");
            progress.setCurrentQuestIndex(4);
            progress.setCompletedAt(System.currentTimeMillis());
            milestoneCompleted = true;

            // Automatically unlock the next milestone in sequence!
            List<Milestone> allMilestones = curriculumRepository.getAllMilestones();
            int currentOrder = milestone.getOrderIndex();
            Optional<Milestone> nextMilestoneOpt = allMilestones.stream()
                    .filter(m -> m.getOrderIndex() == currentOrder + 1)
                    .findFirst();

            if (nextMilestoneOpt.isPresent()) {
                Milestone nextM = nextMilestoneOpt.get();
                nextMilestoneId = nextM.getId();

                UserProgress nextProgress = userProgressRepository.findByUserIdAndMilestoneId(userId, nextM.getId())
                        .orElse(new UserProgress(userId, nextM.getId(), "UNLOCKED"));
                if ("LOCKED".equalsIgnoreCase(nextProgress.getStatus())) {
                    nextProgress.setStatus("UNLOCKED");
                    nextProgress.setCurrentQuestIndex(1);
                    nextProgress.setUnlockedAt(System.currentTimeMillis());
                }
                userProgressRepository.save(nextProgress);
                nextMilestoneUnlocked = true;
            }
        }

        userProgressRepository.save(progress);

        // Update User profile stats
        User user = userRepository.findById(userId).or(() -> userRepository.findByUsername(username)).orElse(null);
        int updatedXp = xpGained;
        int updatedAp = apGained;
        int updatedStreak = 1;

        if (user != null) {
            user.setTotalXp(user.getTotalXp() + xpGained);
            user.setActivePoints(user.getActivePoints() + apGained);
            if (milestoneCompleted) {
                user.setCurrentStreak(user.getCurrentStreak() + 1);
                if (user.getCurrentStreak() > user.getLongestStreak()) {
                    user.setLongestStreak(user.getCurrentStreak());
                }
            }
            userRepository.save(user);

            updatedXp = user.getTotalXp();
            updatedAp = user.getActivePoints();
            updatedStreak = user.getCurrentStreak();

            // Sync to Leaderboard
            LeaderboardEntry entry = leaderboardRepository.findByUserId(user.getId())
                    .orElse(new LeaderboardEntry(user.getId(), user.getFullName() != null ? user.getFullName() : user.getUsername(), user.getAvatarUrl(), user.getActivePoints(), user.getCurrentStreak()));
            entry.setActivePoints(user.getActivePoints());
            entry.setCurrentStreak(user.getCurrentStreak());
            leaderboardRepository.save(entry);
        }

        // Build result
        QuestSubmitResult result = new QuestSubmitResult();
        result.setMilestoneId(milestoneId);
        result.setQuestIndex(questIndex);
        result.setResult("PASSED");
        result.setScoredXp(xpGained);
        result.setScoredActivePoints(apGained);
        result.setMilestoneCompleted(milestoneCompleted);
        result.setNextMilestoneId(nextMilestoneId);
        result.setNextMilestoneUnlocked(nextMilestoneUnlocked);
        result.setUpdatedTotalXp(updatedXp);
        result.setUpdatedActivePoints(updatedAp);
        result.setUpdatedStreak(updatedStreak);
        result.setFeedbackMessage(milestoneCompleted
                ? "🎉 Chúc mừng bạn đã chinh phục thành công mốc học! Mốc tiếp theo đã được mở khóa trên Bản đồ!"
                : "Hoàn thành xuất sắc Bài " + questIndex + "! Bạn nhận được +" + xpGained + " XP và +" + apGained + " Điểm Năng Động.");

        return result;
    }

    @Override
    public List<UserProgress> getUserProgressList(String userId) {
        return userProgressRepository.findByUserId(userId);
    }

    @Override
    public UserProgress getUserMilestoneProgress(String userId, String milestoneId) {
        return userProgressRepository.findByUserIdAndMilestoneId(userId, milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Progress not found for milestone: " + milestoneId));
    }
}
