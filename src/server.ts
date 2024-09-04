import * as fs from "fs";

class Database {
    private records: Map<number, any> = new Map();

    constructor(private filePath: string) {
        this.load();
    }

    private load(): void {
        if (fs.existsSync(this.filePath)) {
            this.records = new Map(
                JSON.parse(fs.readFileSync(this.filePath, "utf8"))
            );
        }
    }

    private save(): void {
        fs.writeFileSync(this.filePath, JSON.stringify([...this.records]));
    }

    private get(id: number): any {
        return this.records.get(id);
    }

    read(id: number): any {
        return this.get(id);
    }

    create(id: number, data: any): void {
        this.records.set(id, data);
        this.save();
    }

    update(id: number, data: any): void {
        this.records.set(id, data);
        this.save();
    }

    delete(id: number): boolean {
        if (!this.records.has(id)) {
            return false;
        }

        this.records.delete(id);
        this.save();
        return true;
    }
}
