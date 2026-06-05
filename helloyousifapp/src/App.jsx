import React, { useState } from "react";
import {
  Home,
  Compass,
  Plus,
  ClipboardList,
  User,
  ChevronLeft,
  MoreHorizontal,
  Lock,
  CheckCircle2,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Color Mapping based on prompt
const PALETTE = {
  NAVY: "#394867",
  DEEP_NAVY: "#212A3E",
  GRAY: "#9BA4B5",
  ICE: "#F1F6F9",
  TEAL: "#1D546D",
  GREEN: "#5F9598",
  BEIGE: "#EAE0CF",
  BLUE: "#94B4C1",
};

const CALENDAR_DAYS = [
  { day: "Mon", date: 7 },
  { day: "Tue", date: 8 },
  { day: "Wed", date: 9 },
  { day: "Thu", date: 10, active: true },
  { day: "Fri", date: 11 },
  { day: "Sat", date: 12 },
  { day: "Sun", date: 13 },
];

const REVISED_EMOTIONS = [
  { label: "Happy", value: 48, color: PALETTE.BEIGE },
  { label: "Sad", value: 33, color: PALETTE.TEAL },
  { label: "Calm", value: 27, color: PALETTE.GREEN },
  { label: "Anxious", value: 40, color: PALETTE.BLUE },
];

const INITIAL_TASKS = [
  {
    id: 1,
    title: "Morning Gratitude",
    desc: "Write down 3 things you are grateful for.",
    assigned: "JM",
    status: "completed",
  },
  {
    id: 2,
    title: "Breathe Deeply",
    desc: "Complete a 5-minute breathing exercise.",
    assigned: "AK",
    status: "active",
  },
  {
    id: 3,
    title: "Evening Reflection",
    desc: "Reflect on the highlights of your day.",
    assigned: "JM",
    status: "locked",
  },
];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [userName] = useState("Jose Maria");
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const completeTask = (id) => {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index === -1) return prev;

      const newTasks = [...prev];
      newTasks[index].status = "completed";

      if (index + 1 < newTasks.length) {
        newTasks[index + 1].status = "active";
      }
      return newTasks;
    });
  };

  const renderScreen = () => {
    switch (screen) {
      case "home":
        return <HomeScreen setScreen={setScreen} tasks={tasks} />;
      case "details":
        return <JournalDetailsScreen setScreen={setScreen} />;
      case "tasks":
        return (
          <SharedTasksScreen
            setScreen={setScreen}
            tasks={tasks}
            completeTask={completeTask}
          />
        );
      default:
        return <HomeScreen setScreen={setScreen} tasks={tasks} />;
    }
  };

  return (
    <div className="iphone-frame">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="page-content"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      <nav className="bottom-nav">
        <button
          onClick={() => setScreen("home")}
          className={screen === "home" ? "active" : ""}
        >
          <Home size={24} />
          <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>Home</span>
        </button>
        <button>
          <Compass size={24} />
          <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>Explore</span>
        </button>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            marginTop: "-40px",
          }}
        >
          <button className="add-btn" onClick={() => setScreen("tasks")}>
            <Plus size={32} />
          </button>
        </div>
        <button
          onClick={() => setScreen("details")}
          className={screen === "details" ? "active" : ""}
        >
          <ClipboardList size={24} />
          <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>Journey</span>
        </button>
        <button>
          <User size={24} />
          <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>Profile</span>
        </button>
      </nav>
    </div>
  );
}

function HomeScreen({ setScreen, tasks }) {
  return (
    <div className="home-screen">
      <header className="header">
        <div>
          <h1 style={{ fontSize: "28px", color: PALETTE.DEEP_NAVY }}>
            Hi, {"Jose Maria"}
          </h1>
        </div>
        <div className="profile-img">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
            alt="Profile"
          />
        </div>
      </header>

      <div className="calendar-strip">
        {CALENDAR_DAYS.map((d, i) => (
          <div key={i} className={`calendar-day ${d.active ? "active" : ""}`}>
            <span className="day-name">{d.day}</span>
            <div className="date-circle">{d.date}</div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2>My Journal</h2>
        <a href="#" className="see-all">
          See all
        </a>
      </div>

      <div className="main-journal-card" onClick={() => setScreen("details")}>
        <div className="journal-content">
          <h3>Let's start your day</h3>
          <p>Begin with a mindful morning reflections.</p>

          <div className="illustration" style={{ marginTop: "20px" }}>
            <svg width="100%" height="80" viewBox="0 0 200 80">
              <circle cx="100" cy="30" r="22" fill={PALETTE.BEIGE} />
              <path
                d="M0 60 Q 50 40, 100 60 T 200 60"
                fill={PALETTE.GREEN}
                opacity="0.6"
              />
              <path d="M0 70 Q 50 50, 100 70 T 200 70" fill={PALETTE.GREEN} />
            </svg>
          </div>
        </div>
        <div className="journal-side-tab">
          <span>Evening</span>
        </div>
      </div>

      <div className="section-header">
        <h2>Quick Journal</h2>
        <a href="#" className="see-all">
          See all
        </a>
      </div>

      <div className="quick-journal-scroll">
        <div className="qj-card" style={{ backgroundColor: "#FFE5E5" }}>
          <div
            className="qj-tag"
            style={{
              color: "#E63946",
              backgroundColor: "rgba(230, 57, 70, 0.1)",
            }}
          >
            Personal
          </div>
          <h3>Pause & reflect 🌿</h3>
          <p>What are you grateful for today?</p>
          <span className="qj-time">Today</span>
        </div>
        <div className="qj-card" style={{ backgroundColor: "#E5EAFF" }}>
          <div
            className="qj-tag"
            style={{
              color: "#4361EE",
              backgroundColor: "rgba(67, 97, 238, 0.1)",
            }}
          >
            Family
          </div>
          <h3>Set Intentions 😊</h3>
          <p>How do you want to feel?</p>
          <span className="qj-time">Today</span>
        </div>
      </div>

      <div className="section-header">
        <h2>Shared Tasks</h2>
        <button
          onClick={() => setScreen("tasks")}
          className="see-all"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          View Group
        </button>
      </div>

      <div className="shared-task-preview" onClick={() => setScreen("tasks")}>
        <div className="task-preview-info">
          <div className="users-group">
            <Users size={16} color={PALETTE.GRAY} />
            <span>3 members active</span>
          </div>
          <h3 style={{ fontSize: "1rem" }}>Family Trip Prep</h3>
          <p style={{ fontSize: "0.85rem", color: PALETTE.GRAY }}>
            2 of 3 tasks completed
          </p>
        </div>
        <div className="task-progress-bar">
          <div className="progress-fill" style={{ width: "66%" }}></div>
        </div>
      </div>
    </div>
  );
}

function JournalDetailsScreen({ setScreen }) {
  return (
    <div className="details-screen">
      <div
        className="top-nav-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <button onClick={() => setScreen("home")} className="nav-icon-btn">
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>My Journal</h2>
        <button className="nav-icon-btn">
          <MoreHorizontal size={24} />
        </button>
      </div>

      <div className="main-metric slide-up">
        <h1>420</h1>
        <p>Celebrate what made you smile today.</p>
      </div>

      <div
        className="card emotions-card slide-up"
        style={{ marginTop: "30px", borderRadius: "32px" }}
      >
        <h3>Emotions</h3>
        <p
          style={{
            fontSize: "0.85rem",
            color: PALETTE.GRAY,
            marginBottom: "20px",
          }}
        >
          Here are four core emotions for your journal
        </p>

        <div className="emotion-bars">
          {REVISED_EMOTIONS.map((em, i) => (
            <div key={i} className="emotion-col">
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    height: `${em.value}%`,
                    backgroundColor: em.color,
                  }}
                >
                  <span className="bar-label">{em.value}%</span>
                </div>
              </div>
              <span className="emotion-name">{em.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        style={{
          marginTop: "20px",
          backgroundColor: PALETTE.BEIGE,
          color: PALETTE.DEEP_NAVY,
          borderRadius: "24px",
          height: "64px",
          fontSize: "1.1rem",
          fontWeight: 700,
        }}
      >
        Create a New Journal
      </button>

      <div className="section-header" style={{ marginTop: "30px" }}>
        <h2>Shared Tasks</h2>
      </div>
      <div
        className="shared-task-preview"
        onClick={() => setScreen("tasks")}
        style={{ marginBottom: "40px" }}
      >
        <div className="task-preview-info">
          <h3 style={{ fontSize: "1rem" }}>Family Trip Prep</h3>
          <p style={{ fontSize: "0.85rem", color: PALETTE.GRAY }}>
            Current Step: 2 of 3
          </p>
        </div>
      </div>
    </div>
  );
}

function SharedTasksScreen({ setScreen, tasks, completeTask }) {
  return (
    <div className="tasks-screen">
      <div
        className="top-nav-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <button onClick={() => setScreen("home")} className="nav-icon-btn">
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Shared Tasks</h2>
        <button className="nav-icon-btn">
          <MoreHorizontal size={24} />
        </button>
      </div>

      <div className="shared-task-header">
        <div className="group-info">
          <h1>Family Trip Prep</h1>
          <p>Work together, one step at a time</p>
        </div>
        <div className="group-avatars">
          <div className="avatar">JM</div>
          <div className="avatar" style={{ backgroundColor: PALETTE.BLUE }}>
            AK
          </div>
          <div className="avatar-add">+</div>
        </div>
      </div>

      <div className="task-list">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`task-item ${task.status}`}
            onClick={() => task.status === "active" && completeTask(task.id)}
          >
            <div className="task-number">{index + 1}</div>
            <div className="task-content">
              <div className="task-header-row">
                <h3>{task.title}</h3>
                {task.status === "locked" && (
                  <Lock size={14} color={PALETTE.GRAY} />
                )}
              </div>
              <p>{task.desc}</p>
              <div className="task-meta">
                <span className="assigned">Assigned to: {task.assigned}</span>
              </div>
            </div>
            <div className="task-status-icon">
              {task.status === "completed" && (
                <CheckCircle2 color={PALETTE.GREEN} size={28} />
              )}
              {task.status === "active" && <div className="active-indicator" />}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        style={{
          marginTop: "30px",
          background: PALETTE.TEAL,
          height: "60px",
          borderRadius: "24px",
        }}
      >
        + Create New Shared Task
      </button>
    </div>
  );
}
