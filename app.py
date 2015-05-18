import json

from flask import Flask, render_template, request, jsonify
from flask.ext.redis import FlaskRedis
from redis import StrictRedis

REDIS_URL = "redis://localhost:6379/0"

user_id = 1  # We can have more than one user, but now it's not necessary

app = Flask(__name__)
app.debug = True
redis_db = FlaskRedis.from_custom_provider(StrictRedis, app)


@app.route("/")
def load_page():
    list_of_todos = json.loads(redis_db.hget('USER::%s::TODOS' % user_id, 'todo_list') or '[]')
    todos = {}
    for todo_id in list_of_todos:
        todos[todo_id] = {'name': redis_db.hget('USER::%s::TODOS' % user_id, 'name::%s' % todo_id),
                          'checked': bool(int(redis_db.hget('USER::%s::TODOS' % user_id, 'status::%s' % todo_id)))}
    return render_template('todo.html', todo_list=map(int, list_of_todos), todos=todos)


@app.route('/api/add_todo', methods=('POST',))
def add_todo():
    todo_name = request.get_json().get('name')
    new_id = redis_db.incr('USER::%s::TODO_ID' % user_id)
    redis_db.hset('USER::%s::TODOS' % user_id, 'name::%s' % new_id, todo_name)
    redis_db.hset('USER::%s::TODOS' % user_id, 'status::%s' % new_id, 0)

    todo_list = json.loads(redis_db.hget('USER::%s::TODOS' % user_id, 'todo_list') or '[]')
    todo_list.append(new_id)
    redis_db.hset('USER::%s::TODOS' % user_id, 'todo_list', json.dumps(todo_list))

    return jsonify(new_id=new_id)


@app.route('/api/todo_checked', methods=('POST',))
def change_status():
    todo_id = request.get_json().get('todo_id')
    new_status = request.get_json().get('checked')

    redis_db.hset('USER::%s::TODOS' % user_id, 'status::%s' % todo_id, int(new_status))
    return jsonify({'status': 'success'})


@app.route('/api/reorder', methods=('POST',))
def change_order():
    new_todo_list = request.get_json().get('todo_list')
    redis_db.hset('USER::%s::TODOS' % user_id, 'todo_list', json.dumps(new_todo_list))
    return jsonify({'status': 'success'})


@app.route('/api/check_all', methods=('POST',))
def mark_all_as_done():
    todo_list = json.loads(redis_db.hget('USER::%s::TODOS' % user_id, 'todo_list') or '[]')
    for todo_id in todo_list:
        redis_db.hset('USER::%s::TODOS' % user_id, 'status::%s' % todo_id, 1)
    return jsonify({'status': 'success'})


if __name__ == "__main__":
    app.run()
