import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'student' | 'admin' | null
  const [studentProfile, setStudentProfile] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth session
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const sessionData = await authService.getCurrentSession();
        if (mounted && sessionData) {
          setCurrentUser(sessionData.user);
          setUserRole(sessionData.role);
          if (sessionData.role === 'student') {
            setStudentProfile(sessionData.profile);
          } else if (sessionData.role === 'admin') {
            setAdminProfile(sessionData.adminProfile);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen for auth state changes if configured
    let subscription = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session) {
          setCurrentUser(null);
          setUserRole(null);
          setStudentProfile(null);
          setAdminProfile(null);
        } else {
          // Re-fetch roles
          const sessionData = await authService.getCurrentSession();
          if (sessionData) {
            setCurrentUser(sessionData.user);
            setUserRole(sessionData.role);
            if (sessionData.role === 'student') setStudentProfile(sessionData.profile);
            if (sessionData.role === 'admin') setAdminProfile(sessionData.adminProfile);
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const requestVoterOtp = async (matric, email) => {
    return await authService.requestVoterOtp(matric, email);
  };

  const loginVoter = async (matric, email, code) => {
    setLoading(true);
    try {
      const result = await authService.verifyVoterOtp(matric, email, code);
      setCurrentUser(result.user);
      setUserRole('student');
      setStudentProfile(result.profile);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const loginStudent = async (matric, password) => {
    setLoading(true);
    try {
      const result = await authService.loginStudent(matric, password);
      setCurrentUser(result.user);
      setUserRole('student');
      setStudentProfile(result.profile);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.loginAdmin(email, password);
      setCurrentUser(result.user);
      setUserRole('admin');
      setAdminProfile(result.adminProfile);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const sessionData = await authService.getCurrentSession();
      if (sessionData) {
        if (sessionData.profile) setStudentProfile(sessionData.profile);
        if (sessionData.adminProfile) setAdminProfile(sessionData.adminProfile);
      }
    }
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setUserRole(null);
    setStudentProfile(null);
    setAdminProfile(null);
  };

  const value = {
    currentUser,
    userRole,
    studentProfile,
    adminProfile,
    loading,
    requestVoterOtp,
    loginVoter,
    loginStudent,
    loginAdmin,
    logout,
    refreshProfile,
    isStudent: userRole === 'student',
    isAdmin: userRole === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
