
const mongoose = require('mongoose');
require('../../src/modules/users/profile.model');

const Profile = mongoose.model('Profile');

describe('Profile Model Validation', () => {
  const validProfile = {
    userId: new mongoose.Types.ObjectId(),
    cgpa: 8.5,
    branch: 'Computer Science',
    gradYear: 2027,
  };

  describe('Skills validation', () => {
    test('accepts a profile with 20 skills', () => {
      const profile = new Profile({
        ...validProfile,
        skills: Array.from({ length: 20 }, (_, i) => `Skill${i + 1}`),
      });

      expect(profile.validateSync()).toBeUndefined();
    });

    test('rejects a profile with 21 skills', () => {
      const profile = new Profile({
        ...validProfile,
        skills: Array.from({ length: 21 }, (_, i) => `Skill${i + 1}`),
      });

      const error = profile.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.skills).toBeDefined();
    });

    test('rejects a skill longer than 30 characters', () => {
      const profile = new Profile({
        ...validProfile,
        skills: ['A'.repeat(31)],
      });

      const error = profile.validateSync();

      expect(error).toBeDefined();
      expect(error.errors['skills.0']).toBeDefined();
    });

    test('accepts a skill with exactly 30 characters', () => {
      const profile = new Profile({
        ...validProfile,
        skills: ['A'.repeat(30)],
      });

      expect(profile.validateSync()).toBeUndefined();
    });
  });

  describe('CGPA validation', () => {
    test('accepts a CGPA of 0', () => {
      const profile = new Profile({
        ...validProfile,
        cgpa: 0,
      });

      expect(profile.validateSync()).toBeUndefined();
    });

    test('accepts a CGPA of 10', () => {
      const profile = new Profile({
        ...validProfile,
        cgpa: 10,
      });

      expect(profile.validateSync()).toBeUndefined();
    });

    test('rejects a CGPA greater than 10', () => {
      const profile = new Profile({
        ...validProfile,
        cgpa: 10.1,
      });

      expect(profile.validateSync()).toBeDefined();
    });

    test('rejects a negative CGPA', () => {
      const profile = new Profile({
        ...validProfile,
        cgpa: -1,
      });

      expect(profile.validateSync()).toBeDefined();
    });
  });

  describe('Graduation year validation', () => {
    test('accepts a graduation year within the allowed range', () => {
      const profile = new Profile({
        ...validProfile,
        gradYear: 2027,
      });

      expect(profile.validateSync()).toBeUndefined();
    });

    test('rejects a graduation year before 2000', () => {
      const profile = new Profile({
        ...validProfile,
        gradYear: 1999,
      });

      expect(profile.validateSync()).toBeDefined();
    });

    test('rejects a graduation year after 2100', () => {
      const profile = new Profile({
        ...validProfile,
        gradYear: 2101,
      });

      expect(profile.validateSync()).toBeDefined();
    });

    test('rejects a non-integer graduation year', () => {
      const profile = new Profile({
        ...validProfile,
        gradYear: 2027.5,
      });

      expect(profile.validateSync()).toBeDefined();
    });
  });

  describe('Branch validation', () => {
    test('accepts a valid branch', () => {
      const profile = new Profile({
        ...validProfile,
        branch: 'Computer Science',
      });

      expect(profile.validateSync()).toBeUndefined();
    });

    test('rejects a branch longer than 100 characters', () => {
      const profile = new Profile({
        ...validProfile,
        branch: 'A'.repeat(101),
      });

      expect(profile.validateSync()).toBeDefined();
    });
  });
});
