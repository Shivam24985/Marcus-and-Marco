import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  Coffee, 
  BookOpen, 
  Clock, 
  Sparkles, 
  Trash2, 
  Volume2, 
  VolumeX,
  Target
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/LoadingSpinner';

const TIMER_STORAGE_KEY = 'skilltrack_active_timer';

export default function StudyTimer() {
  const [searchParams] = useSearchParams();
  const queryGoalId = searchParams.get('goalId');
  const queryTaskId = searchParams.get('taskId');

  const [mode, setMode] = useState('pomodoro'); // 'pomodoro' | 'shortBreak' | 'longBreak' | 'stopwatch'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [customStudyMinutes, setCustomStudyMinutes] = useState(25);
  const [customBreakMinutes, setCustomBreakMinutes] = useState(5);

  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(queryGoalId || '');
  const [selectedTask, setSelectedTask] = useState(queryTaskId || '');
  const [sessionNotes, setSessionNotes] = useState('');

  const [recentSessions, setRecentSessions] = useState([]);
  const [summary, setSummary] = useState({ today: { totalMinutes: 0 }, week: { totalMinutes: 0 } });
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toast = useToast();
  const intervalRef = useRef(null);

  // Play audio chime when timer completes
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('AudioContext beep failed', e);
    }
  }, [soundEnabled]);

  // Load goals, tasks, session summary & recent logs
  const fetchData = useCallback(async () => {
    try {
      const [goalsRes, tasksRes, summaryRes, sessionsRes] = await Promise.all([
        api.get('/goals?limit=100'),
        api.get('/tasks?limit=100'),
        api.get('/study-sessions/summary'),
        api.get('/study-sessions?limit=10')
      ]);
      setGoals(goalsRes.data.goals || []);
      setTasks(tasksRes.data.tasks || []);
      setSummary(summaryRes.data || { today: { totalMinutes: 0 }, week: { totalMinutes: 0 } });
      setRecentSessions(sessionsRes.data.sessions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load study session data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Restore persisted timer state on mount
  useEffect(() => {
    fetchData();

    const savedTimer = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        const elapsed = Math.floor((Date.now() - parsed.lastTimestamp) / 1000);

        setMode(parsed.mode || 'pomodoro');
        setSelectedGoal(parsed.selectedGoal || queryGoalId || '');
        setSelectedTask(parsed.selectedTask || queryTaskId || '');
        setSessionNotes(parsed.sessionNotes || '');

        if (parsed.mode === 'stopwatch') {
          if (parsed.isActive) {
            setStopwatchSeconds((parsed.stopwatchSeconds || 0) + elapsed);
            setIsActive(true);
          } else {
            setStopwatchSeconds(parsed.stopwatchSeconds || 0);
            setIsActive(false);
          }
        } else {
          if (parsed.isActive) {
            const newTime = Math.max(0, (parsed.timeLeft || 0) - elapsed);
            setTimeLeft(newTime);
            setIsActive(newTime > 0);
          } else {
            setTimeLeft(parsed.timeLeft || 25 * 60);
            setIsActive(false);
          }
        }
      } catch (e) {
        console.error('Error restoring timer state', e);
      }
    }
  }, [fetchData, queryGoalId, queryTaskId]);

  // Persist timer state to localStorage whenever state changes
  useEffect(() => {
    const timerState = {
      mode,
      timeLeft,
      stopwatchSeconds,
      isActive,
      selectedGoal,
      selectedTask,
      sessionNotes,
      lastTimestamp: Date.now()
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
  }, [mode, timeLeft, stopwatchSeconds, isActive, selectedGoal, selectedTask, sessionNotes]);

  // Auto-save completed pomodoro study session
  const autoSavePomodoro = useCallback(async (minutes) => {
    try {
      await api.post('/study-sessions', {
        goal: selectedGoal || null,
        task: selectedTask || null,
        duration: minutes || 25,
        date: new Date(),
        type: 'Pomodoro',
        notes: sessionNotes.trim() || 'Completed Pomodoro session'
      });
      toast.success(`Logged ${minutes || 25} minutes of focused study! Goal & streak updated.`);
      handleReset();
      setSessionNotes('');
      fetchData();
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      console.error(err);
      toast.error('Could not auto-save session. Please click Save Session manually.');
    }
  }, [selectedGoal, selectedTask, sessionNotes, toast, fetchData]);

  // Handle countdown & stopwatch intervals
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (mode === 'stopwatch') {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(intervalRef.current);
              setIsActive(false);
              playAlertSound();
              if (mode === 'pomodoro') {
                toast.success('Study session finished! Saving your study progress...');
                autoSavePomodoro(customStudyMinutes);
              } else {
                toast.success('Break finished! Ready to focus again?');
              }
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, mode, playAlertSound, toast, autoSavePomodoro, customStudyMinutes]);

  const switchMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    if (newMode === 'pomodoro') {
      setTimeLeft(customStudyMinutes * 60);
    } else if (newMode === 'shortBreak') {
      setTimeLeft(customBreakMinutes * 60);
    } else if (newMode === 'longBreak') {
      setTimeLeft(15 * 60);
    } else if (newMode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    if (mode === 'pomodoro') setTimeLeft(customStudyMinutes * 60);
    else if (mode === 'shortBreak') setTimeLeft(customBreakMinutes * 60);
    else if (mode === 'longBreak') setTimeLeft(15 * 60);
    else if (mode === 'stopwatch') setStopwatchSeconds(0);
  };

  const handleSaveSession = async () => {
    let durationMinutes = 0;
    if (mode === 'stopwatch') {
      durationMinutes = Math.max(1, Math.round(stopwatchSeconds / 60));
    } else if (mode === 'pomodoro') {
      const elapsed = customStudyMinutes * 60 - timeLeft;
      durationMinutes = Math.max(1, Math.round(elapsed / 60));
    } else {
      toast.info("Break sessions don't need to be saved as study logs!");
      return;
    }

    try {
      await api.post('/study-sessions', {
        goal: selectedGoal || null,
        task: selectedTask || null,
        duration: durationMinutes,
        date: new Date(),
        type: mode === 'pomodoro' ? 'Pomodoro' : 'Free',
        notes: sessionNotes.trim()
      });

      toast.success(`Logged ${durationMinutes} minutes of focused study!`);
      handleReset();
      setSessionNotes('');
      fetchData();
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save session');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.delete(`/study-sessions/${sessionId}`);
      toast.success('Study session deleted');
      fetchData();
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to delete session');
    }
  };

  if (loading) return <PageLoader />;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter tasks based on selected goal
  const availableTasks = selectedGoal
    ? tasks.filter(t => t.goal?._id === selectedGoal || t.goal === selectedGoal)
    : tasks;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Top Banner & Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today Summary */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Today's Focus</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-2">
            {(summary.today?.totalMinutes / 60).toFixed(1)} <span className="text-sm font-normal text-surface-500">hrs</span>
          </span>
          <span className="text-[11px] text-surface-500">
            {summary.today?.totalMinutes || 0} minutes logged today
          </span>
        </div>

        {/* Week Summary */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Weekly Focus</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-2">
            {(summary.week?.totalMinutes / 60).toFixed(1)} <span className="text-sm font-normal text-surface-500">hrs</span>
          </span>
          <span className="text-[11px] text-surface-500">
            {summary.week?.count || 0} deep work sessions this week
          </span>
        </div>

        {/* Sound toggle & quick settings */}
        <div className="stat-card justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Sound Alerts</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-brand-600" /> : <VolumeX className="w-4 h-4 text-surface-400" />}
            </button>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-surface-500">Study mins:</span>
            <input
              type="number"
              min="5"
              max="120"
              value={customStudyMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 25;
                setCustomStudyMinutes(val);
                if (mode === 'pomodoro' && !isActive) setTimeLeft(val * 60);
              }}
              className="w-16 px-2 py-1 text-xs rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
            />
          </div>
        </div>
      </div>

      {/* Main Timer Display Glass Card */}
      <div className="glass-card p-6 md:p-10 text-center relative overflow-hidden">
        {/* Mode Selector Tabs */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 mb-8">
          <button
            onClick={() => switchMode('pomodoro')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'pomodoro'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
            }`}
          >
            Pomodoro ({customStudyMinutes}m)
          </button>
          <button
            onClick={() => switchMode('shortBreak')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'shortBreak'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
            }`}
          >
            Short Break ({customBreakMinutes}m)
          </button>
          <button
            onClick={() => switchMode('stopwatch')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'stopwatch'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
            }`}
          >
            Free Stopwatch
          </button>
        </div>

        {/* Big Digital Clock Display */}
        <div className="my-6">
          <div className="text-7xl md:text-8xl font-black tracking-tight font-mono text-surface-900 dark:text-surface-100 select-none">
            {mode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(timeLeft)}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400 mt-2">
            {isActive ? 'Session In Progress' : 'Paused / Ready'}
          </p>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-8 py-3.5 rounded-2xl font-bold text-sm shadow-md flex items-center gap-2 transition-all duration-200 ${
              isActive
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25'
                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30 hover:scale-105'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-5 h-5 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Start Session</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Save session log button */}
          <button
            onClick={handleSaveSession}
            className="btn-secondary py-3.5 px-5 text-xs font-semibold rounded-2xl flex items-center gap-2"
            title="Save and log this study time"
          >
            <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Save & Log</span>
          </button>
        </div>

        {/* Associate Goal & Task Section */}
        <div className="mt-10 pt-6 border-t border-surface-200/80 dark:border-surface-800 text-left grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">
              Link to Goal (Updates study hours)
            </label>
            <select
              value={selectedGoal}
              onChange={(e) => {
                setSelectedGoal(e.target.value);
                setSelectedTask(''); // reset task when goal changes
              }}
              className="input-field text-xs py-2"
            >
              <option value="">-- General Study (No specific goal) --</option>
              {goals.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.title} ({g.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">
              Link to Task (Optional)
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="input-field text-xs py-2"
            >
              <option value="">-- No specific task --</option>
              {availableTasks.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">
              Session Focus Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Read chapter 4, built binary search tree, solved 2 problems..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="input-field text-xs py-2"
            />
          </div>
        </div>
      </div>

      {/* Recent Session Logs */}
      <div className="glass-card p-6">
        <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-600" />
          <span>Recent Study Sessions</span>
        </h3>

        {recentSessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-surface-500">
            No study sessions logged yet. Complete a study sprint and click "Save & Log"!
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session._id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {session.duration}m
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-surface-900 dark:text-surface-100">
                        {session.goal?.title || 'General Study'}
                      </span>
                      {session.goal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300">
                          {session.goal.subject}
                        </span>
                      )}
                      <span className="badge-neutral text-[10px]">
                        {session.type}
                      </span>
                    </div>

                    {session.notes && (
                      <p className="text-[11px] text-surface-500 mt-0.5">{session.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-surface-400">
                    {new Date(session.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <button
                    onClick={() => handleDeleteSession(session._id)}
                    className="p-1.5 text-surface-400 hover:text-red-500 transition-colors"
                    title="Delete log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
