const TOPICS = Object.freeze(['Quantitative', 'Logical', 'Verbal', 'Technical']);
const DIFFICULTIES = Object.freeze(['Easy', 'Medium', 'Hard']);
const integer = (min, max) => ({
  validator: (value) => Number.isInteger(value) && value >= min && value <= max,
  message: `Expected an integer between ${min} and ${max}`,
});
const questionCount = (values) => values.length >= 5 && values.length <= 60;
const uniqueIds = (values) => new Set(values.map(String)).size === values.length;
const percentage = (correct, total) => (100 * correct) / total;
const sameNumber = (left, right) => Math.abs(left - right) < 0.000001;
module.exports = { TOPICS, DIFFICULTIES, integer, questionCount, uniqueIds, percentage, sameNumber };
