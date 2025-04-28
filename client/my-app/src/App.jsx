import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTransition, animated } from '@react-spring/web';

const BASE_URL = "http://localhost:8000";
const HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;

function App() {
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_completed: false,
    owner: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');
  const [translatedDescriptions, setTranslatedDescriptions] = useState({});
  const [translatingId, setTranslatingId] = useState(null);

  const transitions = useTransition(tasks, {
    from: { opacity: 0, transform: 'translateY(20px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(-20px)' },
    config: { tension: 300, friction: 20 },
    keys: tasks.map(task => task.id),
  });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/tasks`);
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  };

  const translateText = async (text, targetLang) => {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-${targetLang}`, {
          headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
          method: "POST",
          body: JSON.stringify({ inputs: text }),
        }
      );
      const data = await response.json();
      return data?.[0]?.translation_text || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/task-edit/${editingId}`, formData);
        setEditingId(null);
      } else {
        await axios.post(`${BASE_URL}/add-task`, formData);
      }
      setFormData({ name: '', description: '', is_completed: false, owner: '' });
      await fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDelete = async (id) => {
    await axios.delete(`${BASE_URL}/task-del/${id}`);
    await fetchTasks();
  };

  const handleEdit = (task) => {
    setFormData(task);
    setEditingId(task.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTranslate = async (taskId, description) => {
    setTranslatingId(taskId);
    try {
      const translated = await translateText(description, language);
      setTranslatedDescriptions(prev => ({ ...prev, [taskId]: translated }));
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Task Translator Pro
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="pl-8 pr-4 py-2 rounded-lg border border-gray-200 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Spanish</option>
                <option value="fr">🇫🇷 French</option>
                <option value="de">🇩🇪 German</option>
              </select>
              <span className="absolute left-3 top-1/2 -translate-y-1/2">🌐</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl mb-12 transition-all hover:shadow-2xl">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Task Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Enter task name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Owner</label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={e => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Task owner"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                rows="3"
                placeholder="Task description"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_completed}
                  onChange={e => setFormData({ ...formData, is_completed: e.target.checked })}
                  className="w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-blue-600 transition-all"
                />
                <span className="text-gray-600 font-medium">Mark as completed</span>
              </label>

              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                {editingId ? "🔄 Update Task" : "✨ Create Task"}
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-2xl"></div>
              ))}
            </div>
          ) : (
            transitions((style, item) => (
              <animated.div style={style}>
                <div className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border-l-4 border-blue-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`w-2 h-2 rounded-full ${item.is_completed ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                        <h2 className="text-xl font-semibold text-gray-800">{item.name}</h2>
                        <span className="text-sm text-gray-400">@{item.owner}</span>
                      </div>
                      
                      <div className="pl-6">
                        <p className="text-gray-600 mb-2">
                          {translatedDescriptions[item.id] || item.description}
                        </p>
                        <button
                          onClick={() => handleTranslate(item.id, item.description)}
                          disabled={translatingId === item.id}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {translatingId === item.id ? (
                            <>
                              <span className="animate-spin">🌀</span> Translating...
                            </>
                          ) : (
                            <>
                              <span>🌍</span> Translate to {language.toUpperCase()}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </animated.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;