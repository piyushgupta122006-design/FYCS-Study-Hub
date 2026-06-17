import { Trash2, Loader2, Send, Eye } from "lucide-react";

export default function AdminSettings({
  notificationEmail, setNotificationEmail,
  notificationTitle, setNotificationTitle,
  notificationMessage, setNotificationMessage,
  handleSendNotification, isSending,
  sentNotifications, handleDeleteGlobal,
  CREATOR_EMAILS, user, handleResetAnalytics
}) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-3 sm:p-4">
        <h3 className="font-bold text-sm sm:text-base mb-2 sm:mb-3 text-white/90">📢 Send Notification</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-white/70 text-xs sm:text-sm mb-1">Target User Email (leave blank for ALL)</label>
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-white/70 text-xs sm:text-sm mb-1">Notification Title</label>
            <input
              type="text"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="Notification title"
              required
            />
          </div>
          <div>
            <label className="block text-white/70 text-xs sm:text-sm mb-1">Message</label>
            <textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              rows="2"
              className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none resize-y text-sm"
              placeholder="Notification message"
              required
            ></textarea>
          </div>
          <button
            type="button"
            onClick={handleSendNotification}
            disabled={isSending}
            className="w-full btn-primary px-3 py-2 sm:px-4 sm:py-3 font-bold flex items-center justify-center gap-2 text-sm"
          >
            {isSending ? (
              <><Loader2 className="animate-spin" size={16} /> Sending...</>
            ) : (
              <><Send size={16} /> Send</>
            )}
          </button>
        </div>
      </div>

      <div className="glass-card p-4 md:p-6">
        <h3 className="font-bold text-base md:text-lg mb-4 text-white/90">📋 Sent Notifications</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sentNotifications.length > 0 ? (
            sentNotifications.map((notif) => (
              <div key={notif.id} className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
                <div className="min-w-0 flex-1 pr-4">
                  <h4 className="font-bold text-sm text-white truncate">{notif.title}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">To: {notif.targetEmail === 'ALL' ? 'Everyone' : notif.targetEmail}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20"
                    title={`${notif.readBy?.length || 0} users have read this`}
                  >
                    <Eye size={14} />
                    <span>{notif.readBy?.length || 0}</span>
                  </div>

                  {CREATOR_EMAILS.includes(user.email) && (
                    <button
                      onClick={() => handleDeleteGlobal(notif.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-white/50 text-center py-4">No notifications sent yet</p>
          )}
        </div>
      </div>

      <div className="glass-card p-4 md:p-6 border border-rose-500/20 bg-rose-500/5">
        <h3 className="font-bold text-base md:text-lg mb-2 text-rose-300">Danger Zone</h3>
        <p className="text-white/50 text-xs md:text-sm mb-3 md:mb-4">
          These actions cannot be undone. Proceed with caution.
        </p>
        {CREATOR_EMAILS.includes(user.email) && (
          <button
            type="button"
            onClick={handleResetAnalytics}
            className="btn-danger px-4 py-2 md:px-6 md:py-3 font-bold flex items-center gap-2 mb-3 md:mb-4"
          >
            <Trash2 size={18} />
            Reset All Analytics
          </button>
        )}
        <p className="text-xs text-white/40 mt-2 mb-4">
          This will reset all views and downloads to zero
        </p>
      </div>
    </div>
  );
}
