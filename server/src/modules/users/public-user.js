function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    ...(user.srn && { srn: user.srn }),
  };
}

module.exports = publicUser;
