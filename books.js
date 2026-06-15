const BOOKS = [
  { id:'tf120', title:'新托福阅读长难句120句', category:'托福英语', tags:['托福','长难句','语法'], type:'html', url:'toefl/' },
  { id:'cet6', title:'CET6选词填空核心词汇', category:'六级英语', tags:['六级','选词填空','词汇'], type:'html', url:'cet6/' },
];

const CATEGORIES = [...new Set(BOOKS.map(b => b.category))];
const ALL_TAGS = [...new Set(BOOKS.flatMap(b => b.tags))].sort();
