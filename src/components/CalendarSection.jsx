import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const CalendarSection = ({ isPremium }) => {
  const [routine, setRoutine] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const daysOfWeek = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const activities = ['yoga', 'meditacion', 'respiracion'];

  useEffect(() => {
    if (isPremium) {
      fetchRoutine();
    }
  }, [isPremium]);

  const fetchRoutine = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCalendarRoutine();
      setRoutine(response.weekly_routine || {});
    } catch (error) {
      console.error('Error fetching routine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityToggle = (day, activity) => {
    setRoutine(prev => ({
      ...prev,
      [day]: prev[day] ? 
        prev[day].includes(activity) 
          ? prev[day].filter(a => a !== activity)
          : [...prev[day], activity]
        : [activity]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiService.updateCalendarRoutine(routine);
      setEditMode(false);
      alert('Rutina actualizada exitosamente');
    } catch (error) {
      console.error('Error saving routine:', error);
      alert('Error al guardar la rutina');
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleSync = async () => {
    try {
      // En un entorno real, implementarías la autenticación con Google
      await apiService.syncGoogleCalendar('dummy-token');
      alert('Sincronización con Google Calendar configurada (función en desarrollo)');
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      alert('Error al sincronizar con Google Calendar');
    }
  };

  if (!isPremium) {
    return (
      <div className="text-center py-8">
        <p className="text-texto-secundario-dark">
          El calendario está disponible solo para usuarios Premium.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark">
          Mi Calendario
        </h2>
        <div className="flex space-x-4">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="bg-acento-claro text-texto-principal-dark px-6 py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
            >
              Editar Rutina
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 rounded-btn font-montserrat transition ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-btn hover:bg-gray-600 transition font-montserrat"
              >
                Cancelar
              </button>
            </div>
          )}
          <button
            onClick={handleGoogleSync}
            className="bg-blue-600 text-white px-6 py-2 rounded-btn hover:bg-blue-700 transition font-montserrat"
          >
            Sincronizar con Google
          </button>
        </div>
      </div>

      <div className="bg-fondo-claro rounded-2xl p-8 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
          {daysOfWeek.map(day => (
            <div key={day} className="bg-gradient-main-sections rounded-xl p-4">
              <h3 className="text-lg font-bodoni-moda font-medium text-texto-principal-dark mb-4 capitalize">
                {day}
              </h3>
              <div className="space-y-2">
                {activities.map(activity => (
                  <div key={activity} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`${day}-${activity}`}
                      checked={routine[day]?.includes(activity) || false}
                      onChange={() => editMode && handleActivityToggle(day, activity)}
                      disabled={!editMode}
                      className="mr-2"
                    />
                    <label
                      htmlFor={`${day}-${activity}`}
                      className={`text-sm font-montserrat capitalize ${
                        editMode ? 'cursor-pointer' : ''
                      }`}
                    >
                      {activity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-fondo-oscuro text-texto-claro-white rounded-xl">
          <h3 className="text-xl font-bodoni-moda font-medium mb-4">
            Recomendaciones de Rutina
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-montserrat">
            <div>
              <h4 className="font-semibold mb-2">Yoga</h4>
              <p>Ideal para lunes, miércoles y viernes por la mañana para energizar tu día.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Meditación</h4>
              <p>Perfecta para las noches, ayuda a relajar la mente antes de dormir.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Respiración</h4>
              <p>Excelente para comenzar el día o como pausa en momentos de estrés.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSection;