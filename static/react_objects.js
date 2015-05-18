var Input = React.createClass({

    getInitialState: function(){
        return {new_todo: 'asd', input_value: ''};
    },

    handleInputChange: function(event) {
        this.setState({new_todo: event.target.value,
                       input_value: event.target.value});
    },

    onButtonClick: function() {
        if (this.state.input_value != '') {
            this.setState({
                input_value: ''
            });
            this.props.fnClick(this.state.new_todo);
        }
    },

    render: function() {
        return (
            <div className="input_box">
                <input name="new_todo" type="text" value={this.state.input_value} className="add_input" onChange={this.handleInputChange} placeholder="What needs to be done?" />
                <button className="add_button" onClick={this.onButtonClick}>Add Todo</button>
            </div>
         );
    }
});

var Table = React.createClass({

    getInitialState: function() {
        return {todo_ids: this.props.todo_ids,
                todos: this.props.todos,
                left_todo: this.props.left_todo}
    },


    changeSelection: function(e) {
        var todos = this.state.todos;
        todos[e.target.id]['checked'] = e.target.checked;
        this.setState({todos: todos});
        this.props.recount();
        $.ajax({
            type: "POST",
            url: '/api/todo_checked',
            data: JSON.stringify({'todo_id': e.target.id,
                                  'checked': e.target.checked}),
            dataType: 'json',
            contentType: "application/json",
        });
    },

    getPlaceholder: function() {
        if (!this.placeholder) {
            var tr = document.createElement('tr');
            tr.className = "placeholder";
            var td = document.createElement('td');
            td.colSpan = 2;
            td.appendChild(document.createTextNode(""));
            tr.appendChild(td);
            this.placeholder = tr;
        }
        return this.placeholder;
    },

    getTableRow: function(element) {
        if (element.tagName !== 'tr') {
            el = $(element).closest('tr')[0];
            if(typeof el === 'undefined'){
                return this.last_closest;
            };
            this.last_closest = el;
            return el;
        }
        else {
            this.last_closest = element;
            return element;
        }
    },

    dragOver: function(e) {
        e.preventDefault();
        var targetRow = this.getTableRow(e.target);
        this.dragged.style.display = "none";
        if (targetRow.className == "placeholder") return;
        this.over = targetRow;
        // Inside the dragOver method
        var relY = e.pageY - $(this.over).offset().top;
        var height = this.over.offsetHeight / 2;
        var parent = targetRow.parentNode;

        if (relY >= height) {
            this.nodePlacement = "after";
            parent.insertBefore(this.getPlaceholder(), targetRow.nextElementSibling);
        }
        else { // relY < height
            this.nodePlacement = "before"
            parent.insertBefore(this.getPlaceholder(), targetRow);
        }
    },
    dragEnd: function(e) {
        this.dragged.style.display = "table-row";
        this.dragged.parentNode.removeChild(this.getPlaceholder());
        var from = Number(this.dragged.dataset.id);
        var to = Number(this.over.dataset.id);
        var index_from = this.state.todo_ids.indexOf(from);
        var index_to = this.state.todo_ids.indexOf(to);
        this.state.todo_ids.splice(index_to, 0, this.state.todo_ids.splice(index_from, 1)[0]);
        var new_todo_ids = this.state.todo_ids;
        this.setState({todo_ids: new_todo_ids});
        $.ajax({
            type: "POST",
            url: '/api/reorder',
            data: JSON.stringify({'todo_list': new_todo_ids}),
            dataType: 'json',
            contentType: "application/json",
        });

    },

    dragStart: function(e) {
        this.dragged = this.getTableRow(e.currentTarget);
        e.dataTransfer.effectAllowed = 'move';
        // Firefox requires dataTransfer data to be set
        e.dataTransfer.setData("text/html", e.currentTarget);
    },
    render: function() {
        var cx = React.addons.classSet;
        var classes = cx({
            'checkbox_checked': this.state.checked,
            'checkbox_unchecked': !this.state.checked,
        });
        var tableRows = this.state.todo_ids.map((function(item, i) {
            return (
                <tr draggable="true" onDragEnd={this.dragEnd} onDragStart={this.dragStart} data-id={this.state.todo_ids[i]}>
                    <td>
                        <div className={this.state.todos[this.state.todo_ids[i]]['checked'] ? 'checkbox_checked' : 'checkbox_unchecked'}>
                                <input type="checkbox"
                                       name="checkbox"
                                       onChange={this.changeSelection}
                                       checked={this.state.todos[this.state.todo_ids[i]]['checked']} onvalue="value" id={this.state.todo_ids[i]}/><label>{this.state.todos[this.state.todo_ids[i]]['name']}</label>
                        </div>
                    </td>
                </tr>
            );
        }).bind(this));


        return (
            <div className="bordered">
                <table id="todo_table">
                    <tbody onDragOver={this.dragOver}>
                        {tableRows}
                    </tbody>
                </table>
            </div>
        );
    }
});

var BottomBlock = React.createClass({
    getInitialState: function() {
        return {left_todo: this.props.left_todo}
    },
    componentWillReceiveProps: function(next_props) {
        this.setState({left_todo: next_props.left_todo});
    },
    render: function() {
        return (
            <div className="bottom_block">
                <span className="left_todo">{this.state.left_todo} items left</span>
                <span className="mark_all" onClick={this.props.markAllFunc}>
                    Mark all as complete
                </span>
            </div>
        );
    }

});


var Container = React.createClass({

    recountTodoLeft: function() {
        var left_todo = 0;
        for (var key in this.state.todos) {
            if (this.state.todos[key]['checked'] == false) {
                left_todo++;
            }
        };
        this.setState({left_todo: left_todo});
    },

    markAllAsDone: function(e) {
        for (var key in this.state.todos) {
            this.state.todos[key]['checked'] = true;
        };
        $.ajax({
            type: "POST",
            url: '/api/check_all',
        });
        this.setState({todos: this.state.todos});
    },

    addRow: function(new_row) {
        var new_id = null;
        var that = this;
        $.ajax({
            type: "POST",
            url: '/api/add_todo',
            data: JSON.stringify({'name': new_row}),
            dataType: 'json',
            contentType: "application/json",
            success: function(data) {
                new_id = data['new_id'];
                that.state.todo_list.push(data['new_id']);
                var new_todo_props = {'name': new_row, 'checked': false};
                that.state.todos[new_id] = new_todo_props;
                that.recountTodoLeft();
                that.setState({
                    todo_list: that.state.todo_list,
                    todos: that.state.todos});
                }
        });

    },

    getInitialState: function(){
        var todo_list = this.props.todo_list;
        var todos = this.props.todos;
        var left_todo = 0;
        for (var key in todos) {

            if (todos[key]['checked'] == false) {
                left_todo++;
            }
        };
        return {
            todo_list: todo_list,
            todos: todos,
            left_todo: left_todo};

    },


    render: function() {

        return (
            <div>
                <Input fnClick={this.addRow}></Input>
                <Table todo_ids={this.state.todo_list} todos={this.state.todos} recount={this.recountTodoLeft} />
                <BottomBlock left_todo={this.state.left_todo} markAllFunc={this.markAllAsDone} />
            </div>
        );
    }
});
