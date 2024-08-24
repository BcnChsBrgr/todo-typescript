interface Todo {
    id: number;
    text: string;
    completed: boolean;
}
class Todo {
    constructor(
        public id: number,
        public text: string,
        public completed: boolean = false
    ) {}
}
