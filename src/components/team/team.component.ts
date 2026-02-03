
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, TeamMember } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';

// --- NEW DATA MODELS ---

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Elite';
export type Badge = 'Follow-up Master' | 'Fast Responder' | 'Negotiation Ninja' | 'Consistency Champion' | 'Team Player';
export type LeaderboardTab = 'improvement' | 'consistency' | 'response_time' | 'top_closer';

export interface CoachingPlan {
  goal: string;
  actions: { text: string; completed: boolean }[];
  dueDate: string;
  progress: number;
}

export interface Rep extends TeamMember {
  disciplineScore: number;
  currentTier: Tier;
  streaks: {
    followUp: number;
    response: number;
  };
  badges: Badge[];
  weeklyDelta: {
    revenue: number;
    discipline: number;
  };
  currentFocus: string;
  coachingPlan?: CoachingPlan;
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamComponent {
  dataService = inject(DataService);
  toastService = inject(ToastService);

  // --- COMPONENT STATE ---
  selectedRep = signal<Rep | null>(null);
  isProfileOpen = signal(false);
  activeLeaderboard = signal<LeaderboardTab>('improvement');

  // --- DERIVED & AUGMENTED DATA ---
  private teamData = signal<Rep[]>(this.loadTeamData());

  constructor() {
    effect(() => {
      localStorage.setItem('revenue-os-team-data', JSON.stringify(this.teamData()));
    });
  }

  private loadTeamData(): Rep[] {
    const savedData = localStorage.getItem('revenue-os-team-data');
    if (savedData) {
      return JSON.parse(savedData);
    }
    return this.dataService.teamPerformance().map(member => this.augmentRepData(member));
  }

  private augmentRepData(member: TeamMember): Rep {
    const disciplineScore = Math.round(((100 - member.avgResponseTime / 2) + member.followUpRate) / 2);
    return {
      ...member,
      disciplineScore,
      currentTier: this.getTier(disciplineScore, member.revenue),
      streaks: {
        followUp: member.followUpRate > 95 ? 12 : 3,
        response: member.avgResponseTime < 20 ? 8 : 0,
      },
      badges: this.getBadges(member),
      weeklyDelta: {
        revenue: (Math.random() - 0.3) * 15000,
        discipline: (Math.random() - 0.4) * 10,
      },
      currentFocus: member.needsCoaching[0] || 'Scaling Consistency',
       coachingPlan: member.id === 2 ? {
          goal: 'Achieve >90% follow-up rate for 2 consecutive weeks.',
          actions: [
            { text: 'Set reminders for all "Proposal Viewed" events.', completed: true },
            { text: 'Use Lucas AI script for follow-ups.', completed: false },
            { text: 'Review overdue actions at EOD.', completed: false },
          ],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 33,
        } : undefined,
    };
  }
  
  private getTier(discipline: number, revenue: number): Tier {
    if (revenue > 150000 && discipline > 90) return 'Elite';
    if (revenue > 100000 && discipline > 85) return 'Gold';
    if (revenue > 75000 || discipline > 75) return 'Silver';
    return 'Bronze';
  }

  private getBadges(member: TeamMember): Badge[] {
    const badges: Badge[] = [];
    if (member.followUpRate > 98) badges.push('Follow-up Master');
    if (member.avgResponseTime < 15) badges.push('Fast Responder');
    if (member.id === 3) badges.push('Negotiation Ninja');
    if (member.trend === 'stable') badges.push('Consistency Champion');
    return badges;
  }

  reps = computed(() => this.teamData());

  // --- HEADER & MOMENTUM STATS ---
  teamMomentum = computed(() => {
    const reps = this.reps();
    return {
      revenue: reps.reduce((sum, r) => sum + r.revenue, 0),
      dealsWon: reps.reduce((sum, r) => sum + r.dealsWon, 0),
      avgDiscipline: reps.length > 0 ? reps.reduce((sum, r) => sum + r.disciplineScore, 0) / reps.length : 0,
      teamStreak: 5, // Simulated
    };
  });
  
  // --- LEADERBOARDS ---
  leaderboardData = computed(() => {
    const reps = [...this.reps()];
    switch (this.activeLeaderboard()) {
      case 'improvement':
        return reps.sort((a, b) => b.weeklyDelta.discipline - a.weeklyDelta.discipline);
      case 'consistency':
        return reps.sort((a, b) => b.streaks.followUp - a.streaks.followUp);
      case 'response_time':
        return reps.sort((a, b) => a.avgResponseTime - b.avgResponseTime);
      case 'top_closer':
        return reps.sort((a, b) => b.dealsWon - a.dealsWon);
      default:
        return reps;
    }
  });

  // --- COACHING & AI ---
  coachingSignals = computed(() => this.reps().filter(r => r.disciplineScore < 80).sort((a,b) => a.disciplineScore - b.disciplineScore));
  
  managerCopilot = computed(() => {
    const reps = this.reps();
    const needsAttention = reps.filter(r => r.disciplineScore < 80 || r.weeklyDelta.revenue < -5000).sort((a,b) => a.disciplineScore - b.disciplineScore);
    return {
      top3: needsAttention.slice(0, 3),
      recommendedChallenge: 'Team goal: Achieve a 95% collective follow-up rate this week.'
    }
  });

  lucasCoach = computed(() => {
    const rep = this.selectedRep();
    if (!rep) return null;
    
    switch (rep.currentFocus) {
      case 'Follow-up discipline':
        return {
          bottleneck: 'Follow-ups after proposal views are inconsistent.',
          action: 'Set a task to follow-up within 3 hours of every "Proposal Viewed" notification.',
          script: "Hi [Client Name], just wanted to check if you had any initial thoughts on the proposal I sent over. Happy to clarify any points!",
          challenge: '7-Day Follow-up Streak'
        };
      case 'Negotiation skills':
         return {
          bottleneck: 'Deals are stalling in the negotiation stage.',
          action: 'When a client mentions price, re-validate the value before offering a discount.',
          script: "I understand the budget is a key factor. Before we discuss numbers, can we quickly confirm that the proposed solution solves your main problem effectively?",
          challenge: 'Close a stalled deal'
        };
      default:
        return {
          bottleneck: 'Performance is strong. The next level is about scaling your success.',
          action: 'Identify the top 3 characteristics of your last 5 won deals to build a high-probability target profile.',
          script: null,
          challenge: 'Mentor a teammate'
        };
    }
  });

  // --- UI ACTIONS ---
  openProfile(rep: Rep) {
    this.selectedRep.set(rep);
    this.isProfileOpen.set(true);
  }

  toggleCoachingAction(repId: number, actionIndex: number) {
    this.teamData.update(reps => reps.map(rep => {
      if (rep.id === repId && rep.coachingPlan) {
        const updatedActions = rep.coachingPlan.actions.map((act, i) => i === actionIndex ? { ...act, completed: !act.completed } : act);
        const completedCount = updatedActions.filter(a => a.completed).length;
        const progress = Math.round((completedCount / updatedActions.length) * 100);
        return { ...rep, coachingPlan: { ...rep.coachingPlan, actions: updatedActions, progress } };
      }
      return rep;
    }));
    // Also update selectedRep to reflect change immediately if it's the one being viewed
    this.selectedRep.update(rep => {
       if (rep && rep.id === repId && rep.coachingPlan) {
          const updatedActions = rep.coachingPlan.actions.map((act, i) => i === actionIndex ? { ...act, completed: !act.completed } : act);
          const completedCount = updatedActions.filter(a => a.completed).length;
          const progress = Math.round((completedCount / updatedActions.length) * 100);
          return { ...rep, coachingPlan: { ...rep.coachingPlan, actions: updatedActions, progress } };
       }
       return rep;
    });
  }

  copyScript(script: string | null) {
    if (!script) return;
    navigator.clipboard.writeText(script);
    this.toastService.show('success', 'Script copied!');
  }
}
