import { Search, Crown, Shield, User, CheckCircle, XCircle } from "lucide-react";

export default function AdminUsers({
  userSearchTerm, setUserSearchTerm,
  filteredUsers, visibleUsersCount,
  CREATOR_EMAILS,
  promoteUser, demoteUser,
  handleToggleBan, handleUnban,
  desktopUserRef, mobileUserRef
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <h3 className="font-bold text-lg text-white/90">User Management</h3>
        <p className="text-sm text-white/50 mt-1">Manage registered users and their roles</p>

        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-white/50" />
          </div>
          <input
            type="text"
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full glass-card pl-10 pr-4 py-2 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-[#FFD700] focus:outline-none"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Name</th>
              <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Email</th>
              <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Role</th>
              <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              <>
                {filteredUsers.slice(0, visibleUsersCount).map((user, index) => {
                  return (
                    <tr key={`user-${user.id}`} className="border-b border-white/5 hover:bg-white/2">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.displayName || user.name}</span>
                          {CREATOR_EMAILS.includes(user.email) && (
                            <span className="inline-flex items-center px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-bold rounded-full">
                              <Crown size={12} className="mr-1" /> Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-white/70">{user.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}>
                          {user.role === "admin" ? (
                            <><Shield size={12} className="mr-1" /> Admin</>
                          ) : (
                            <><User size={12} className="mr-1" /> Student</>
                          )}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {!CREATOR_EMAILS.includes(user.email) ? (
                            <div className="flex items-center gap-2">
                              {user.role === "student" ? (
                                <button
                                  type="button"
                                  onClick={() => promoteUser(user.id, user.email)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-500/15 text-purple-300 text-sm font-bold hover:bg-purple-500/25 transition-colors"
                                >
                                  <Shield size={14} /> Promote
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => demoteUser(user.id, user.email)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-sm font-bold hover:bg-amber-500/25 transition-colors"
                                >
                                  <User size={14} /> Demote
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleBan(user)}
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                                  user.isBanned
                                    ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                    : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                                }`}
                              >
                                {user.isBanned ? (
                                  <><CheckCircle size={14} /> Unban</>
                                ) : (
                                  <><XCircle size={14} /> Ban</>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center gap-1 w-fit">
                              👑 Creator
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleUsersCount < filteredUsers.length && (
                  <tr ref={desktopUserRef} key="loading-indicator">
                    <td colSpan="4" className="p-6">
                      <div className="w-full py-6 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                        <span className="ml-3 text-zinc-400 text-sm">Loading more...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <tr>
                <td colSpan="4" className="p-8 text-center">
                  <User size={32} className="mx-auto mb-3 text-white/60" />
                  <p className="text-white/80 text-sm font-medium">No users found</p>
                  {userSearchTerm && <p className="text-white/60 text-xs mt-1">Try a different search term</p>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-4 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
        {filteredUsers.length > 0 ? (
          <>
            {filteredUsers.slice(0, visibleUsersCount).map((user, index) => {
              return (
                <div key={`user-${user.id}`} className="glass-card p-4">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-sm truncate">{user.displayName || user.name}</h3>
                        {CREATOR_EMAILS.includes(user.email) && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-[9px] font-bold rounded-full whitespace-nowrap">
                            <Crown size={8} className="mr-0.5" /> Super Admin
                          </span>
                        )}
                      </div>
                      <p className="text-white/70 text-xs mt-1 truncate max-w-[180px] sm:max-w-xs">{user.email}</p>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                        user.role === "admin"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {user.role === "admin" ? (
                          <><Shield size={10} className="mr-1" /> Admin</>
                        ) : (
                          <><User size={10} className="mr-1" /> Student</>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!CREATOR_EMAILS.includes(user.email) ? (
                      <div className="flex items-center gap-2 w-full">
                        {user.role === "student" ? (
                          <button
                            type="button"
                            onClick={() => promoteUser(user.id, user.email)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-bold hover:bg-purple-500/25 transition-colors"
                          >
                            <Shield size={12} /> Promote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => demoteUser(user.id, user.email)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors"
                          >
                            <User size={12} /> Demote
                          </button>
                        )}

                        {user.isBanned ? (
                          <button
                            type="button"
                            onClick={() => handleUnban(user.id, user.email)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-colors"
                          >
                            <CheckCircle size={12} /> Unban
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleBan(user)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-bold hover:bg-rose-500/25 transition-colors"
                          >
                            <XCircle size={12} /> Ban
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center justify-center gap-1 w-full">
                        👑 Creator
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {visibleUsersCount < filteredUsers.length && (
              <div ref={mobileUserRef} className="w-full py-6 flex justify-center items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                <span className="ml-3 text-zinc-400 text-sm">Loading more...</span>
              </div>
            )}
          </>
        ) : (
          <div className="glass-card p-8 text-center">
            <User size={32} className="mx-auto mb-3 text-white/60" />
            <p className="text-white/80 text-sm font-medium">No users found</p>
            {userSearchTerm && <p className="text-white/60 text-xs mt-1">Try a different search term</p>}
          </div>
        )}
      </div>
    </div>
  );
}
