import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('videos');
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para formularios
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    youtube_url: '',
    category: 'COMUNIDAD',
    thumbnail_url: '',
    duration: '',
    is_premium: false
  });

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    price: 0,
    duration: '',
    level: 'Principiante',
    image_url: '',
    youtube_url: '',
    program: ''
  });

  const [blogForm, setBlogForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    image_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [videosData, coursesData, blogData] = await Promise.all([
        apiService.getAdminVideos(),
        apiService.getAdminCourses(),
        apiService.getBlogPosts()
      ]);
      setVideos(videosData);
      setCourses(coursesData);
      setBlogPosts(blogData);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.createVideo(videoForm);
      setVideoForm({
        title: '',
        description: '',
        youtube_url: '',
        category: 'COMUNIDAD',
        thumbnail_url: '',
        duration: '',
        is_premium: false
      });
      loadData();
      alert('Video creado exitosamente');
    } catch (err) {
      console.error('Error creating video:', err);
      alert('Error al crear el video');
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.createCourse(courseForm);
      setCourseForm({
        title: '',
        description: '',
        price: 0,
        duration: '',
        level: 'Principiante',
        image_url: '',
        youtube_url: '',
        program: ''
      });
      loadData();
      alert('Curso creado exitosamente');
    } catch (err) {
      console.error('Error creating course:', err);
      alert('Error al crear el curso');
    }
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.createBlogPost(blogForm);
      setBlogForm({
        title: '',
        content: '',
        excerpt: '',
        image_url: ''
      });
      loadData();
      alert('Artículo creado exitosamente');
    } catch (err) {
      console.error('Error creating blog post:', err);
      alert('Error al crear el artículo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-fondo-oscuro text-texto-claro-white py-6">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bodoni-moda font-medium">Panel de Administración</h1>
          <p className="mt-2 font-montserrat">Gestiona el contenido de Calma Mi Alma</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex space-x-1 bg-fondo-claro p-1 rounded-lg mb-8">
          {['videos', 'courses', 'blog'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-montserrat transition ${
                activeTab === tab
                  ? 'bg-fondo-oscuro text-texto-claro-white'
                  : 'text-texto-principal-dark hover:bg-acento-claro'
              }`}
            >
              {tab === 'videos' ? 'Videos' : tab === 'courses' ? 'Cursos' : 'Blog'}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Video Form */}
            <div className="bg-fondo-claro p-6 rounded-2xl">
              <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">
                Crear Nuevo Video
              </h2>
              <form onSubmit={handleVideoSubmit} className="space-y-4">
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Título</label>
                  <input
                    type="text"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({...videoForm, title: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    required
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Descripción</label>
                  <textarea
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({...videoForm, description: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">URL de YouTube</label>
                  <input
                    type="url"
                    value={videoForm.youtube_url}
                    onChange={(e) => setVideoForm({...videoForm, youtube_url: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    required
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Categoría</label>
                  <select
                    value={videoForm.category}
                    onChange={(e) => setVideoForm({...videoForm, category: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                  >
                    <option value="COMUNIDAD">Comunidad</option>
                    <option value="MEDITACION">Meditación</option>
                    <option value="YOGA">Yoga</option>
                  </select>
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Duración</label>
                  <input
                    type="text"
                    value={videoForm.duration}
                    onChange={(e) => setVideoForm({...videoForm, duration: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    placeholder="ej: 15:30"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_premium"
                    checked={videoForm.is_premium}
                    onChange={(e) => setVideoForm({...videoForm, is_premium: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="is_premium" className="text-texto-principal-dark font-montserrat">
                    Video Premium
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-fondo-oscuro text-texto-claro-white py-3 rounded-lg font-montserrat hover:bg-acento-claro transition"
                >
                  Crear Video
                </button>
              </form>
            </div>

            {/* Videos List */}
            <div className="bg-fondo-claro p-6 rounded-2xl">
              <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">
                Videos Existentes
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {videos.map(video => (
                  <div key={video.id} className="border border-acento-claro p-4 rounded-lg">
                    <h3 className="font-medium text-texto-principal-dark">{video.title}</h3>
                    <p className="text-sm text-texto-secundario-dark mt-1">{video.category}</p>
                    <p className="text-xs text-texto-secundario-dark mt-1">{video.duration}</p>
                    {video.is_premium && (
                      <span className="inline-block bg-acento-claro text-texto-principal-dark text-xs px-2 py-1 rounded mt-2">
                        Premium
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Course Form */}
            <div className="bg-fondo-claro p-6 rounded-2xl">
              <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">
                Crear Nuevo Curso
              </h2>
              <form onSubmit={handleCourseSubmit} className="space-y-4">
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Título</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    required
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Descripción</label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    rows="3"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-texto-principal-dark mb-2 font-montserrat">Precio USD</label>
                    <input
                      type="number"
                      value={courseForm.price}
                      onChange={(e) => setCourseForm({...courseForm, price: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-texto-principal-dark mb-2 font-montserrat">Duración</label>
                    <input
                      type="text"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                      className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                      placeholder="ej: 4 semanas"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Nivel</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({...courseForm, level: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                  >
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Todos los niveles">Todos los niveles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">URL de YouTube (opcional)</label>
                  <input
                    type="url"
                    value={courseForm.youtube_url}
                    onChange={(e) => setCourseForm({...courseForm, youtube_url: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Programa del Curso</label>
                  <textarea
                    value={courseForm.program}
                    onChange={(e) => setCourseForm({...courseForm, program: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    rows="4"
                    placeholder="Describe el programa semana por semana..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-fondo-oscuro text-texto-claro-white py-3 rounded-lg font-montserrat hover:bg-acento-claro transition"
                >
                  Crear Curso
                </button>
              </form>
            </div>

            {/* Courses List */}
            <div className="bg-fondo-claro p-6 rounded-2xl">
              <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">
                Cursos Existentes
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {courses.map(course => (
                  <div key={course.id} className="border border-acento-claro p-4 rounded-lg">
                    <h3 className="font-medium text-texto-principal-dark">{course.title}</h3>
                    <p className="text-sm text-texto-secundario-dark mt-1">{course.level}</p>
                    <p className="text-sm text-acento-claro mt-1 font-semibold">
                      ${course.price === 0 ? 'Gratuito' : course.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-texto-secundario-dark mt-1">{course.duration}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Blog Form */}
            <div className="bg-fondo-claro p-6 rounded-2xl">
              <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">
                Crear Nuevo Artículo
              </h2>
              <form onSubmit={handleBlogSubmit} className="space-y-4">
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Título</label>
                  <input
                    type="text"
                    value={blogForm.title}
                    onChange={(e) => setBlogForm({...blogForm, title: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    required
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Resumen</label>
                  <textarea
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({...blogForm, excerpt: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">Contenido</label>
                  <textarea
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({...blogForm, content: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                    rows="8"
                    required
                  />
                </div>
                <div>
                  <label className="block text-texto-principal-dark mb-2 font-montserrat">URL de Imagen (opcional)</label>
                  <input
                    type="url"
                    value={blogForm.image_url}
                    onChange={(e) => setBlogForm({...blogForm, image_url: e.target.value})}
                    className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-fondo-oscuro text-texto-claro-white py-3 rounded-lg font-montserrat hover:bg-acento-claro transition"
                >
                  Crear Artículo
                </button>
              </form>
            </div>

            {/* Blog Posts List */}
            <div className="bg-fondo-claro p-6 rounded-2xl">
              <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">
                Artículos Existentes
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {blogPosts.map(post => (
                  <div key={post.id} className="border border-acento-claro p-4 rounded-lg">
                    <h3 className="font-medium text-texto-principal-dark">{post.title}</h3>
                    <p className="text-sm text-texto-secundario-dark mt-1">{post.excerpt}</p>
                    <p className="text-xs text-texto-secundario-dark mt-2">
                      {new Date(post.published_date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;