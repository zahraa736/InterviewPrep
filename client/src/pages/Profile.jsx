function Profile({ user, onLogout, showLogout = true }) {
  return (
    <section className="profile-card">
      <div className="profile-banner">
        <div className="profile-avatar" aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">Your profile</p>
          <h1>{user.name}</h1>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>

      <div className="profile-details">
        <div>
          <span>Full name</span>
          <strong>{user.name}</strong>
        </div>
        <div>
          <span>Email address</span>
          <strong>{user.email}</strong>
        </div>
      </div>

      {showLogout && <button type="button" className="profile-logout" onClick={onLogout}>Log out</button>}
    </section>
  );
}

export default Profile;
