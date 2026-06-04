const BOOKS = [
  { id:'tf120', title:'新托福阅读长难句120句', category:'托福英语', tags:['托福','长难句','语法'], type:'html', url:'index.html' },
];

const CATEGORIES = [...new Set(BOOKS.map(b => b.category))];
const ALL_TAGS = [...new Set(BOOKS.flatMap(b => b.tags))].sort();
