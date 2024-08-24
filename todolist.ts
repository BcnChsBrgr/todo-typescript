class TodoList {
    private todos: Todo[] = [];

    addTodo(todo: Todo): void {
        this.todos.push(todo);
    }

    removeTodo(id: number): void {
        this.todos = this.todos.filter((todo) => todo.id !== id);
    }

    getTodos(): Todo[] {
        return this.todos;
    }
}
