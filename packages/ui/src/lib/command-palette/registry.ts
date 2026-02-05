export interface Command {
	id: string;
	label: string;
	description?: string;
	icon?: string;
	shortcut?: string;
	category?: string;
	action: () => void | Promise<void>;
	keywords?: string[];
}

class CommandRegistry {
	private commands: Map<string, Command> = new Map();
	private listeners: Set<() => void> = new Set();

	register(command: Command): void {
		this.commands.set(command.id, command);
		this.notifyListeners();
	}

	registerMultiple(commands: Command[]): void {
		commands.forEach(cmd => this.commands.set(cmd.id, cmd));
		this.notifyListeners();
	}

	unregister(id: string): void {
		this.commands.delete(id);
		this.notifyListeners();
	}

	clear(): void {
		this.commands.clear();
		this.notifyListeners();
	}

	get(id: string): Command | undefined {
		return this.commands.get(id);
	}

	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	getByCategory(category: string): Command[] {
		return this.getAll().filter(cmd => cmd.category === category);
	}

	search(query: string): Command[] {
		if (!query.trim()) return this.getAll();

		const lowerQuery = query.toLowerCase();
		return this.getAll().filter(cmd => {
			const searchText = [
				cmd.label,
				cmd.description || '',
				cmd.category || '',
				...(cmd.keywords || [])
			].join(' ').toLowerCase();

			return searchText.includes(lowerQuery);
		}).sort((a, b) => {
			const aLabel = a.label.toLowerCase();
			const bLabel = b.label.toLowerCase();
			const aStarts = aLabel.startsWith(lowerQuery);
			const bStarts = bLabel.startsWith(lowerQuery);

			if (aStarts && !bStarts) return -1;
			if (!aStarts && bStarts) return 1;
			return aLabel.localeCompare(bLabel);
		});
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notifyListeners(): void {
		this.listeners.forEach(listener => listener());
	}
}

export const commandRegistry = new CommandRegistry();
