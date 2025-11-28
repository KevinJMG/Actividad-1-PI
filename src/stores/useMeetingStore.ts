import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Meeting {
  id: string;
  meetingName: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  participants: string[];
  settings: {
    waitingRoom: boolean;
    screenSharing: boolean;
    privateRoom: boolean;
    chat: boolean;
    requirePassword: boolean;
  };
  createdAt: string;
}

type MeetingStore = {
  meetings: Meeting[];
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => void;
  removeMeeting: (id: string) => void;
  updateMeeting: (id: string, meeting: Omit<Meeting, 'id' | 'createdAt'>) => void;
  getMeetingById: (id: string) => Meeting | undefined;
  getUpcomingMeetings: () => Meeting[];
};

const useMeetingStore = create<MeetingStore>()(
  persist(
    (set, get) => ({
      meetings: [],

      addMeeting: (meetingData) => {
        const newMeeting: Meeting = {
          ...meetingData,
          id: `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          meetings: [...state.meetings, newMeeting],
        }));
      },

      removeMeeting: (id) => {
        set((state) => ({
          meetings: state.meetings.filter((meeting) => meeting.id !== id),
        }));
      },

      updateMeeting: (id, meetingData) => {
        set((state) => ({
          meetings: state.meetings.map((meeting) =>
            meeting.id === id
              ? {
                  ...meeting,
                  ...meetingData,
                  id: meeting.id, // Mantener el ID original
                  createdAt: meeting.createdAt, // Mantener la fecha de creación
                }
              : meeting
          ),
        }));
      },

      getMeetingById: (id) => {
        return get().meetings.find((meeting) => meeting.id === id);
      },

      getUpcomingMeetings: () => {
        const now = new Date();
        return get()
          .meetings.filter((meeting) => {
            const meetingDateTime = new Date(`${meeting.date}T${meeting.startTime}`);
            return meetingDateTime >= now;
          })
          .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.startTime}`);
            const dateB = new Date(`${b.date}T${b.startTime}`);
            return dateA.getTime() - dateB.getTime();
          });
      },
    }),
    {
      name: 'meeting-storage',
    }
  )
);

export default useMeetingStore;
